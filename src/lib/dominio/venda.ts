// Contas da venda no caixa (PDV). Roda igual no navegador (para mostrar o total enquanto a
// pessoa monta a venda) e no servidor (que refaz tudo antes de gravar, sem confiar na tela).

export const FORMAS_PAGAMENTO = ['DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO'] as const;
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];

export const NOME_FORMA: Record<FormaPagamento, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  CARTAO_DEBITO: 'Débito',
  CARTAO_CREDITO: 'Crédito',
};

export type Papel = 'ADMIN' | 'VENDEDOR';

export interface ItemVenda {
  produtoId: string;
  nome: string;
  precoUnitario: number; // centavos
  quantidade: number;
  estoque: number;
}

export interface PagamentoVenda {
  forma: FormaPagamento;
  valor: number; // centavos
}

export interface ResumoVenda {
  subtotal: number;
  desconto: number;
  total: number;
  pago: number;
  troco: number;
  falta: number;
  erros: string[];
}

/** Vendedor pode dar até 10% de desconto; acima disso só o dono. */
export function descontoMaximo(papel: Papel, subtotal: number): number {
  return papel === 'ADMIN' ? subtotal : Math.floor(subtotal * 0.1);
}

export function calcularVenda({
  itens,
  desconto = 0,
  pagamentos = [],
  papel = 'VENDEDOR',
}: {
  itens: ItemVenda[];
  desconto?: number;
  pagamentos?: PagamentoVenda[];
  papel?: Papel;
}): ResumoVenda {
  const erros: string[] = [];
  if (!itens.length) erros.push('Adicione pelo menos um produto.');

  for (const item of itens) {
    if (!Number.isInteger(item.quantidade) || item.quantidade < 1) {
      erros.push(`Quantidade inválida para ${item.nome}.`);
    } else if (item.quantidade > item.estoque) {
      erros.push(`Só tem ${item.estoque} de ${item.nome} no estoque.`);
    }
  }

  const subtotal = itens.reduce((s, i) => s + i.precoUnitario * Math.max(0, i.quantidade), 0);

  if (!Number.isInteger(desconto) || desconto < 0) erros.push('Desconto inválido.');
  else if (desconto > descontoMaximo(papel, subtotal)) {
    erros.push(papel === 'ADMIN' ? 'Desconto maior que a venda.' : 'Desconto acima de 10% precisa do dono da loja.');
  }

  const total = Math.max(0, subtotal - Math.max(0, desconto));
  let pago = 0;
  let dinheiro = 0;
  for (const p of pagamentos) {
    if (!Number.isInteger(p.valor) || p.valor <= 0) {
      erros.push('Valor de pagamento inválido.');
      continue;
    }
    pago += p.valor;
    if (p.forma === 'DINHEIRO') dinheiro += p.valor;
  }

  const outros = pago - dinheiro;
  if (outros > total) erros.push('Pix e cartão não podem passar do total da venda (troco só em dinheiro).');

  const sobra = pago - total;
  const troco = sobra > 0 ? Math.min(sobra, dinheiro) : 0;
  const falta = Math.max(0, total - pago);

  return { subtotal, desconto, total, pago, troco, falta, erros };
}

/** Pronta para finalizar: sem erros e paga por completo. */
export function vendaFechada(r: ResumoVenda): boolean {
  return r.erros.length === 0 && r.falta === 0;
}
