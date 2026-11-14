import { vendasPorDia, maisVendidos, ticketMedio, diaLocal, FUSO } from '@/lib/dominio/relatorios';
import { situacaoEstoque } from '@/lib/dominio/estoque';
import type { FormaPagamento } from '@/lib/dominio/venda';
import type { Banco } from './base';

/** Meia-noite (horário de Brasília) do dia de `d`, como Date em UTC. */
export function inicioDoDia(d: Date): Date {
  const dia = diaLocal(d);
  // Brasília não tem horário de verão desde 2019: -03:00 fixo
  return new Date(`${dia}T00:00:00-03:00`);
}

export function somarDias(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}

async function vendasDoPeriodo(db: Banco, inicio: Date, fim: Date) {
  return db.venda.findMany({
    where: { status: 'CONCLUIDA', criadoEm: { gte: inicio, lt: fim } },
    select: {
      id: true,
      total: true,
      desconto: true,
      criadoEm: true,
      vendedor: { select: { id: true, nome: true } },
      pagamentos: { select: { forma: true, valor: true } },
      troco: true,
      itens: {
        select: {
          produtoId: true, nomeProduto: true, quantidade: true, total: true, custoUnitario: true,
          produto: { select: { categoria: { select: { nome: true } } } },
        },
      },
    },
  });
}

function custoDe(vendas: Awaited<ReturnType<typeof vendasDoPeriodo>>) {
  return vendas.reduce((s, v) => s + v.itens.reduce((t, i) => t + i.custoUnitario * i.quantidade, 0), 0);
}

export async function dadosPainel(db: Banco, agora = new Date()) {
  const hoje = inicioDoDia(agora);
  const amanha = somarDias(hoje, 1);
  const inicioGrafico = somarDias(hoje, -13);
  const inicioOntem = somarDias(hoje, -1);

  const [vendas14, ontem, produtos] = await Promise.all([
    vendasDoPeriodo(db, inicioGrafico, amanha),
    db.venda.aggregate({ where: { status: 'CONCLUIDA', criadoEm: { gte: inicioOntem, lt: hoje } }, _sum: { total: true }, _count: true }),
    db.produto.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, estoque: true, estoqueMinimo: true, unidade: true },
      orderBy: { estoque: 'asc' },
    }),
  ]);

  const deHoje = vendas14.filter((v) => v.criadoEm >= hoje);
  const faturamento = deHoje.reduce((s, v) => s + v.total, 0);
  const custo = custoDe(deHoje);

  const alertas = produtos
    .map((p) => ({ ...p, situacao: situacaoEstoque(p.estoque, p.estoqueMinimo) }))
    .filter((p) => p.situacao !== 'OK')
    .slice(0, 8);

  return {
    hoje: {
      faturamento,
      vendas: deHoje.length,
      ticket: ticketMedio(faturamento, deHoje.length),
      lucroBruto: faturamento - custo,
    },
    ontem: { faturamento: ontem._sum.total ?? 0, vendas: ontem._count },
    grafico: vendasPorDia(vendas14, inicioGrafico, hoje),
    maisVendidos: maisVendidos(
      vendas14.flatMap((v) => v.itens.map((i) => ({ produtoId: i.produtoId, nome: i.nomeProduto, quantidade: i.quantidade, total: i.total, custo: i.custoUnitario * i.quantidade }))),
      5,
    ),
    alertas,
    totalAlertas: produtos.filter((p) => situacaoEstoque(p.estoque, p.estoqueMinimo) !== 'OK').length,
  };
}

export async function relatorioPeriodo(db: Banco, inicio: Date, fim: Date) {
  const vendas = await vendasDoPeriodo(db, inicio, fim);
  const faturamento = vendas.reduce((s, v) => s + v.total, 0);
  const descontos = vendas.reduce((s, v) => s + v.desconto, 0);
  const custo = custoDe(vendas);

  const porForma: Record<FormaPagamento, number> = { DINHEIRO: 0, PIX: 0, CARTAO_DEBITO: 0, CARTAO_CREDITO: 0 };
  for (const v of vendas) {
    for (const p of v.pagamentos) porForma[p.forma] += p.valor;
    porForma.DINHEIRO -= v.troco; // o troco volta para o cliente
  }

  const porVendedor = new Map<string, { nome: string; total: number; vendas: number }>();
  const porCategoria = new Map<string, { nome: string; total: number; quantidade: number }>();
  for (const v of vendas) {
    const pv = porVendedor.get(v.vendedor.id) ?? { nome: v.vendedor.nome, total: 0, vendas: 0 };
    pv.total += v.total;
    pv.vendas++;
    porVendedor.set(v.vendedor.id, pv);
    for (const i of v.itens) {
      const nome = i.produto.categoria?.nome ?? 'Sem categoria';
      const pc = porCategoria.get(nome) ?? { nome, total: 0, quantidade: 0 };
      pc.total += i.total;
      pc.quantidade += i.quantidade;
      porCategoria.set(nome, pc);
    }
  }

  const itens = vendas.flatMap((v) =>
    v.itens.map((i) => ({ produtoId: i.produtoId, nome: i.nomeProduto, quantidade: i.quantidade, total: i.total, custo: i.custoUnitario * i.quantidade })),
  );

  return {
    faturamento,
    descontos,
    custo,
    lucroBruto: faturamento - custo,
    vendas: vendas.length,
    ticket: ticketMedio(faturamento, vendas.length),
    porDia: vendasPorDia(vendas, inicio, somarDias(fim, -1)),
    porForma,
    porVendedor: [...porVendedor.values()].sort((a, b) => b.total - a.total),
    porCategoria: [...porCategoria.values()].sort((a, b) => b.total - a.total),
    produtos: maisVendidos(itens, 1000),
  };
}

export { FUSO };
