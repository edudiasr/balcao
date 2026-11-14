import { z } from 'zod';
import { calcularMovimento } from '@/lib/dominio/estoque';
import { ErroNegocio, duplicado, naoEncontrado, type Banco } from './base';

export const UNIDADES = ['un', 'kg', 'g', 'l', 'ml', 'cx', 'pct'] as const;

const centavos = z.number().int('Valor inválido.').min(0, 'Valor não pode ser negativo.');

export const esquemaProduto = z
  .object({
    codigo: z.string().trim().min(1, 'Informe o código.').max(40).regex(/^[\w.-]+$/, 'Use só letras, números, ponto e traço.'),
    nome: z.string().trim().min(2, 'Nome muito curto.').max(120),
    descricao: z.string().trim().max(500).optional().nullable(),
    categoriaId: z.string().optional().nullable(),
    unidade: z.enum(UNIDADES),
    precoCusto: centavos,
    precoVenda: centavos.min(1, 'Informe o preço de venda.'),
    estoqueMinimo: z.number().int().min(0),
    ativo: z.boolean(),
  })
  .refine((p) => p.precoVenda >= p.precoCusto, { message: 'O preço de venda está abaixo do custo.', path: ['precoVenda'] });

export type DadosProduto = z.infer<typeof esquemaProduto>;

function tratarDuplicado(e: unknown): never {
  if (duplicado(e)) throw new ErroNegocio('Já existe um produto com esse código.');
  throw e;
}

/** Chame dentro de uma transação: cria o produto e, se tiver estoque inicial, o movimento de entrada. */
export async function criarProduto(db: Banco, dados: DadosProduto, estoqueInicial: number, usuarioId: string) {
  if (!Number.isInteger(estoqueInicial) || estoqueInicial < 0) throw new ErroNegocio('Estoque inicial inválido.');
  try {
    const p = await db.produto.create({ data: { ...dados, estoque: estoqueInicial } });
    if (estoqueInicial > 0) {
      await db.movimentoEstoque.create({
        data: { produtoId: p.id, tipo: 'ENTRADA', quantidade: estoqueInicial, saldoApos: estoqueInicial, motivo: 'Estoque inicial', usuarioId },
      });
    }
    return p;
  } catch (e) {
    tratarDuplicado(e);
  }
}

export async function atualizarProduto(db: Banco, id: string, dados: DadosProduto) {
  try {
    return await db.produto.update({ where: { id }, data: dados });
  } catch (e) {
    if (naoEncontrado(e)) throw new ErroNegocio('Produto não encontrado.');
    tratarDuplicado(e);
  }
}

/**
 * Entrada, saída ou ajuste manual. O update só acontece se o saldo ainda for o que foi lido
 * (controle de concorrência otimista): se outra pessoa vendeu no meio, a conta não fica errada.
 */
export async function movimentarEstoque(
  db: Banco,
  { produtoId, tipo, quantidade, motivo, usuarioId }: {
    produtoId: string;
    tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE';
    quantidade: number;
    motivo?: string | null;
    usuarioId: string;
  },
) {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const p = await db.produto.findUnique({ where: { id: produtoId }, select: { estoque: true } });
    if (!p) throw new ErroNegocio('Produto não encontrado.');
    const mov = calcularMovimento(tipo, quantidade, p.estoque);
    if ('erro' in mov) throw new ErroNegocio(mov.erro);
    if (mov.delta === 0) throw new ErroNegocio('O saldo contado é igual ao atual, nada para ajustar.');
    const alterou = await db.produto.updateMany({
      where: { id: produtoId, estoque: p.estoque },
      data: { estoque: mov.saldoApos },
    });
    if (alterou.count === 1) {
      return db.movimentoEstoque.create({
        data: { produtoId, tipo, quantidade: mov.delta, saldoApos: mov.saldoApos, motivo: motivo || null, usuarioId },
      });
    }
  }
  throw new ErroNegocio('O estoque mudou enquanto você salvava. Tente de novo.');
}
