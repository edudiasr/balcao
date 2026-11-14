// Fechamento de caixa: quanto deveria ter na gaveta e quanto de diferença deu.

import type { FormaPagamento } from './venda';

export interface VendaDoCaixa {
  status: 'CONCLUIDA' | 'CANCELADA';
  total: number;
  troco: number;
  pagamentos: { forma: FormaPagamento; valor: number }[];
}

export interface MovimentoDoCaixa {
  tipo: 'SANGRIA' | 'SUPRIMENTO';
  valor: number;
}

export interface ResumoCaixa {
  qtdVendas: number;
  totalVendido: number;
  porForma: Record<FormaPagamento, number>;
  sangrias: number;
  suprimentos: number;
  troco: number;
  dinheiroEsperado: number;
}

export function resumirCaixa(valorAbertura: number, vendas: VendaDoCaixa[], movimentos: MovimentoDoCaixa[]): ResumoCaixa {
  const porForma: Record<FormaPagamento, number> = { DINHEIRO: 0, PIX: 0, CARTAO_DEBITO: 0, CARTAO_CREDITO: 0 };
  let totalVendido = 0;
  let qtdVendas = 0;
  let troco = 0;
  for (const v of vendas) {
    if (v.status !== 'CONCLUIDA') continue; // cancelada não entra
    qtdVendas++;
    totalVendido += v.total;
    troco += v.troco;
    for (const p of v.pagamentos) porForma[p.forma] += p.valor;
  }
  const sangrias = movimentos.filter((m) => m.tipo === 'SANGRIA').reduce((s, m) => s + m.valor, 0);
  const suprimentos = movimentos.filter((m) => m.tipo === 'SUPRIMENTO').reduce((s, m) => s + m.valor, 0);
  // na gaveta: o que abriu + dinheiro recebido - troco devolvido + suprimento - sangria
  const dinheiroEsperado = valorAbertura + porForma.DINHEIRO - troco + suprimentos - sangrias;
  return { qtdVendas, totalVendido, porForma, sangrias, suprimentos, troco, dinheiroEsperado };
}

/** Positivo = sobrou dinheiro na gaveta; negativo = faltou. */
export const diferencaFechamento = (esperado: number, contado: number) => contado - esperado;
