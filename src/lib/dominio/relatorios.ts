// Agrupamentos para o painel e os relatórios.

export const FUSO = 'America/Sao_Paulo';

const fmtDia = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' });

/** Dia no fuso da loja (AAAA-MM-DD). Uma venda às 22h de Brasília não pode cair no dia seguinte. */
export const diaLocal = (d: Date) => fmtDia.format(d);

/** Lista de dias entre duas datas (inclusive), no fuso da loja. */
export function diasEntre(inicio: Date, fim: Date): string[] {
  const dias: string[] = [];
  const atual = new Date(inicio);
  // anda de 12 em 12 horas para não pular dia por causa de fuso/horário de verão
  while (diaLocal(atual) <= diaLocal(fim)) {
    const d = diaLocal(atual);
    if (dias[dias.length - 1] !== d) dias.push(d);
    atual.setTime(atual.getTime() + 12 * 3600 * 1000);
  }
  return dias;
}

export function vendasPorDia(vendas: { criadoEm: Date; total: number }[], inicio: Date, fim: Date) {
  const mapa = new Map(diasEntre(inicio, fim).map((d) => [d, { dia: d, total: 0, qtd: 0 }]));
  for (const v of vendas) {
    const linha = mapa.get(diaLocal(v.criadoEm));
    if (!linha) continue;
    linha.total += v.total;
    linha.qtd++;
  }
  return [...mapa.values()];
}

export interface ItemVendido {
  produtoId: string;
  nome: string;
  quantidade: number;
  total: number;
  custo: number; // custo total (custo unitário x quantidade)
}

export function maisVendidos(itens: ItemVendido[], limite = 5) {
  const mapa = new Map<string, ItemVendido>();
  for (const i of itens) {
    const a = mapa.get(i.produtoId) ?? { ...i, quantidade: 0, total: 0, custo: 0 };
    a.quantidade += i.quantidade;
    a.total += i.total;
    a.custo += i.custo;
    mapa.set(i.produtoId, a);
  }
  return [...mapa.values()].sort((a, b) => b.total - a.total || b.quantidade - a.quantidade).slice(0, limite);
}

export const ticketMedio = (total: number, qtd: number) => (qtd ? Math.round(total / qtd) : 0);

/** CSV com ";" (o Excel em português abre direto) e aspas quando precisa. */
export function paraCsv(linhas: Record<string, string | number | null>[]): string {
  if (!linhas.length) return '';
  const colunas = Object.keys(linhas[0]);
  const celula = (v: string | number | null) => {
    const t = v == null ? '' : String(v);
    return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return [colunas.join(';'), ...linhas.map((l) => colunas.map((c) => celula(l[c])).join(';'))].join('\r\n');
}
