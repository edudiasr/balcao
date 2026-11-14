// Dinheiro sempre em centavos (número inteiro). Nada de float para valor de venda.

const formatador = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatarReais(centavos: number): string {
  return formatador.format(centavos / 100);
}

/**
 * Converte o que a pessoa digitou ("12,50", "1.234,56", "R$ 10", "12.5") em centavos.
 * Devolve null se não for um valor válido.
 */
export function paraCentavos(texto: string | null | undefined): number | null {
  if (texto == null) return null;
  let t = String(texto).replace(/R\$|\s/g, '').trim();
  if (!t) return null;
  if (t.includes(',')) {
    // formato brasileiro: ponto é milhar, vírgula é decimal
    t = t.replace(/\./g, '').replace(',', '.');
  } else if ((t.match(/\./g) ?? []).length > 1) {
    t = t.replace(/\./g, '');
  }
  if (!/^-?\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}

/** Centavos -> texto para colocar de volta num input ("12,50"). */
export function centavosParaInput(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',');
}

export function porcentagem(parte: number, todo: number): number {
  if (!todo) return 0;
  return Math.round((parte / todo) * 1000) / 10;
}
