import { inicioDoDia, somarDias } from '@/lib/servicos/relatorios';

const dataValida = (s: unknown) => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '');
const iso = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

/** Lê ?de=&ate= (dias inclusivos). Padrão: últimos 30 dias. Limita a 1 ano para a consulta não pesar. */
export function lerPeriodo(sp: Record<string, string | string[] | undefined>) {
  const hoje = inicioDoDia(new Date());
  let ate = dataValida(sp.ate) || iso(hoje);
  let de = dataValida(sp.de) || iso(somarDias(hoje, -29));
  if (de > ate) [de, ate] = [ate, de];
  const inicio = new Date(`${de}T00:00:00-03:00`);
  let fim = somarDias(new Date(`${ate}T00:00:00-03:00`), 1); // exclusivo
  if (fim.getTime() - inicio.getTime() > 366 * 86400000) {
    fim = somarDias(inicio, 366);
    ate = iso(somarDias(fim, -1));
  }
  return { de, ate, inicio, fim };
}

/** Agora menos N dias (para filtros do tipo "últimos 30 dias"). */
export const diasAtras = (n: number) => new Date(Date.now() - n * 86400000);

export function atalhosPeriodo() {
  const hoje = inicioDoDia(new Date());
  const h = iso(hoje);
  const primeiroDoMes = `${h.slice(0, 8)}01`;
  return [
    { rotulo: 'Hoje', de: h, ate: h },
    { rotulo: '7 dias', de: iso(somarDias(hoje, -6)), ate: h },
    { rotulo: '30 dias', de: iso(somarDias(hoje, -29)), ate: h },
    { rotulo: 'Este mês', de: primeiroDoMes, ate: h },
  ];
}
