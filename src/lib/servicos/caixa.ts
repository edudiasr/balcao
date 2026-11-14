import { resumirCaixa, diferencaFechamento } from '@/lib/dominio/caixa';
import { ErroNegocio, duplicado, type Banco } from './base';

export async function caixaAberto(db: Banco) {
  return db.caixa.findFirst({ where: { status: 'ABERTO' }, include: { abertoPor: { select: { nome: true } } } });
}

export async function abrirCaixa(db: Banco, usuarioId: string, valorAbertura: number) {
  if (!Number.isInteger(valorAbertura) || valorAbertura < 0) throw new ErroNegocio('Valor de abertura inválido.');
  try {
    return await db.caixa.create({ data: { abertoPorId: usuarioId, valorAbertura } });
  } catch (e) {
    // o índice parcial do banco garante um caixa aberto só, mesmo com dois cliques ao mesmo tempo
    if (duplicado(e)) throw new ErroNegocio('Já existe um caixa aberto.');
    throw e;
  }
}

export async function resumoDoCaixa(db: Banco, caixaId: string) {
  const caixa = await db.caixa.findUniqueOrThrow({
    where: { id: caixaId },
    include: {
      vendas: { select: { status: true, total: true, troco: true, pagamentos: { select: { forma: true, valor: true } } } },
      movimentos: { orderBy: { criadoEm: 'asc' }, include: { usuario: { select: { nome: true } } } },
      abertoPor: { select: { nome: true } },
      fechadoPor: { select: { nome: true } },
    },
  });
  return { caixa, resumo: resumirCaixa(caixa.valorAbertura, caixa.vendas, caixa.movimentos) };
}

export async function movimentarCaixa(
  db: Banco,
  { tipo, valor, motivo, usuarioId }: { tipo: 'SANGRIA' | 'SUPRIMENTO'; valor: number; motivo: string; usuarioId: string },
) {
  const caixa = await caixaAberto(db);
  if (!caixa) throw new ErroNegocio('Abra o caixa primeiro.');
  if (!Number.isInteger(valor) || valor <= 0) throw new ErroNegocio('Informe um valor maior que zero.');
  if (motivo.trim().length < 3) throw new ErroNegocio('Diga o motivo (ex.: depósito no banco, troco).');
  if (tipo === 'SANGRIA') {
    const { resumo } = await resumoDoCaixa(db, caixa.id);
    if (valor > resumo.dinheiroEsperado) throw new ErroNegocio('Não tem esse valor em dinheiro no caixa.');
  }
  return db.movimentoCaixa.create({ data: { caixaId: caixa.id, tipo, valor, motivo: motivo.trim(), usuarioId } });
}

export async function fecharCaixa(
  db: Banco,
  { usuarioId, valorContado, observacao }: { usuarioId: string; valorContado: number; observacao?: string | null },
) {
  const caixa = await caixaAberto(db);
  if (!caixa) throw new ErroNegocio('Não tem caixa aberto.');
  if (!Number.isInteger(valorContado) || valorContado < 0) throw new ErroNegocio('Informe quanto tem na gaveta.');
  const { resumo } = await resumoDoCaixa(db, caixa.id);
  const diferenca = diferencaFechamento(resumo.dinheiroEsperado, valorContado);
  if (diferenca !== 0 && !observacao?.trim()) {
    throw new ErroNegocio('Deu diferença no caixa. Escreva uma observação explicando antes de fechar.');
  }
  return db.caixa.update({
    where: { id: caixa.id },
    data: {
      status: 'FECHADO',
      fechadoPorId: usuarioId,
      fechadoEm: new Date(),
      valorEsperado: resumo.dinheiroEsperado,
      valorContado,
      observacao: observacao?.trim() || null,
    },
  });
}
