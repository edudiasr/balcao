import { z } from 'zod';
import type { PrismaClient } from '@/generated/prisma/client';
import { calcularVenda, FORMAS_PAGAMENTO, vendaFechada, type Papel } from '@/lib/dominio/venda';
import { ErroNegocio, naoEncontrado } from './base';

export const esquemaVenda = z.object({
  itens: z
    .array(z.object({ produtoId: z.string().min(1), quantidade: z.number().int().positive() }))
    .min(1, 'Adicione pelo menos um produto.')
    .max(200),
  desconto: z.number().int().min(0).default(0),
  pagamentos: z.array(z.object({ forma: z.enum(FORMAS_PAGAMENTO), valor: z.number().int().positive() })).min(1, 'Informe o pagamento.'),
  clienteId: z.string().optional().nullable(),
});

export type PedidoVenda = z.infer<typeof esquemaVenda>;

/**
 * Fecha uma venda numa transação só: confere caixa, recalcula preços pelo banco (a tela não manda
 * preço), baixa o estoque, grava itens, pagamentos e o histórico de estoque. Se qualquer passo
 * falhar, nada fica gravado.
 */
export async function finalizarVenda(db: PrismaClient, usuario: { id: string; papel: Papel }, pedido: PedidoVenda) {
  // o mesmo produto em duas linhas vira uma só
  const qtdPorProduto = new Map<string, number>();
  for (const i of pedido.itens) qtdPorProduto.set(i.produtoId, (qtdPorProduto.get(i.produtoId) ?? 0) + i.quantidade);

  return db.$transaction(async (tx) => {
    const caixa = await tx.caixa.findFirst({ where: { status: 'ABERTO' }, select: { id: true } });
    if (!caixa) throw new ErroNegocio('O caixa está fechado. Abra o caixa para vender.');

    const produtos = await tx.produto.findMany({ where: { id: { in: [...qtdPorProduto.keys()] }, ativo: true } });
    if (produtos.length !== qtdPorProduto.size) throw new ErroNegocio('Algum produto não existe mais ou foi desativado.');

    const itens = produtos.map((p) => ({
      produtoId: p.id,
      nome: p.nome,
      precoUnitario: p.precoVenda,
      custoUnitario: p.precoCusto,
      quantidade: qtdPorProduto.get(p.id)!,
      estoque: p.estoque,
    }));
    const r = calcularVenda({ itens, desconto: pedido.desconto, pagamentos: pedido.pagamentos, papel: usuario.papel });
    if (r.erros.length) throw new ErroNegocio(r.erros[0]);
    if (!vendaFechada(r)) throw new ErroNegocio('O pagamento não cobre o total da venda.');

    if (pedido.clienteId) {
      const existe = await tx.cliente.count({ where: { id: pedido.clienteId } });
      if (!existe) throw new ErroNegocio('Cliente não encontrado.');
    }

    const venda = await tx.venda.create({
      data: {
        caixaId: caixa.id,
        vendedorId: usuario.id,
        clienteId: pedido.clienteId || null,
        subtotal: r.subtotal,
        desconto: r.desconto,
        total: r.total,
        troco: r.troco,
        itens: {
          create: itens.map((i) => ({
            produtoId: i.produtoId,
            nomeProduto: i.nome,
            quantidade: i.quantidade,
            precoUnitario: i.precoUnitario,
            custoUnitario: i.custoUnitario,
            total: i.precoUnitario * i.quantidade,
          })),
        },
        pagamentos: { create: pedido.pagamentos },
      },
    });

    for (const i of itens) {
      // o "estoque >= quantidade" no where faz a baixa e a conferência num passo só:
      // se outra venda levou o último item um instante antes, este update falha
      try {
        const p = await tx.produto.update({
          where: { id: i.produtoId, estoque: { gte: i.quantidade } },
          data: { estoque: { decrement: i.quantidade } },
          select: { estoque: true },
        });
        await tx.movimentoEstoque.create({
          data: { produtoId: i.produtoId, tipo: 'VENDA', quantidade: -i.quantidade, saldoApos: p.estoque, usuarioId: usuario.id, vendaId: venda.id },
        });
      } catch (e) {
        if (naoEncontrado(e)) throw new ErroNegocio(`Acabou o estoque de ${i.nome} enquanto a venda era feita.`);
        throw e;
      }
    }
    return venda;
  });
}

/** Cancela, devolve os itens ao estoque e registra quem cancelou. Só vale com o caixa da venda aberto. */
export async function cancelarVenda(db: PrismaClient, { vendaId, usuarioId, motivo }: { vendaId: string; usuarioId: string; motivo: string }) {
  if (motivo.trim().length < 5) throw new ErroNegocio('Explique o motivo do cancelamento.');
  return db.$transaction(async (tx) => {
    const venda = await tx.venda.findUnique({ where: { id: vendaId }, include: { itens: true, caixa: { select: { status: true } } } });
    if (!venda) throw new ErroNegocio('Venda não encontrada.');
    if (venda.status === 'CANCELADA') throw new ErroNegocio('Essa venda já foi cancelada.');
    if (venda.caixa.status !== 'ABERTO') throw new ErroNegocio('O caixa dessa venda já foi fechado. Faça uma devolução pelo estoque.');

    // update condicional: dois cancelamentos ao mesmo tempo não devolvem o estoque duas vezes
    const marcou = await tx.venda.updateMany({
      where: { id: vendaId, status: 'CONCLUIDA' },
      data: { status: 'CANCELADA', canceladaEm: new Date(), canceladaPorId: usuarioId, motivoCancelamento: motivo.trim() },
    });
    if (marcou.count !== 1) throw new ErroNegocio('Essa venda já foi cancelada.');

    for (const i of venda.itens) {
      const p = await tx.produto.update({
        where: { id: i.produtoId },
        data: { estoque: { increment: i.quantidade } },
        select: { estoque: true },
      });
      await tx.movimentoEstoque.create({
        data: { produtoId: i.produtoId, tipo: 'CANCELAMENTO', quantidade: i.quantidade, saldoApos: p.estoque, usuarioId, vendaId, motivo: motivo.trim() },
      });
    }
    return venda;
  });
}
