// Regras de movimentação de estoque. Toda mudança de saldo vira uma linha no histórico.

export const TIPOS_MOVIMENTO = ['ENTRADA', 'SAIDA', 'AJUSTE', 'VENDA', 'CANCELAMENTO'] as const;
export type TipoMovimento = (typeof TIPOS_MOVIMENTO)[number];

export const NOME_MOVIMENTO: Record<TipoMovimento, string> = {
  ENTRADA: 'Entrada',
  SAIDA: 'Saída',
  AJUSTE: 'Ajuste de inventário',
  VENDA: 'Venda',
  CANCELAMENTO: 'Venda cancelada',
};

export type Movimento = { delta: number; saldoApos: number } | { erro: string };

/**
 * Quanto o saldo muda.
 * Em AJUSTE, `quantidade` é o saldo contado na prateleira (o novo saldo), não a diferença.
 */
export function calcularMovimento(tipo: TipoMovimento, quantidade: number, saldoAtual: number): Movimento {
  if (!Number.isInteger(quantidade)) return { erro: 'Use números inteiros.' };
  if (tipo === 'AJUSTE') {
    if (quantidade < 0) return { erro: 'O saldo contado não pode ser negativo.' };
    return { delta: quantidade - saldoAtual, saldoApos: quantidade };
  }
  if (quantidade <= 0) return { erro: 'A quantidade precisa ser maior que zero.' };
  const sinal = tipo === 'ENTRADA' || tipo === 'CANCELAMENTO' ? 1 : -1;
  const saldoApos = saldoAtual + sinal * quantidade;
  if (saldoApos < 0) return { erro: `Estoque insuficiente: tem ${saldoAtual}.` };
  return { delta: sinal * quantidade, saldoApos };
}

export type Situacao = 'ZERADO' | 'BAIXO' | 'OK';

export function situacaoEstoque(estoque: number, minimo: number): Situacao {
  if (estoque <= 0) return 'ZERADO';
  if (estoque <= minimo) return 'BAIXO';
  return 'OK';
}

/** Margem sobre o preço de venda, em %. */
export function margemProduto(precoCusto: number, precoVenda: number): number {
  if (!precoVenda) return 0;
  return Math.round(((precoVenda - precoCusto) / precoVenda) * 1000) / 10;
}
