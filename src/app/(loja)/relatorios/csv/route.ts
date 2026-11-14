import { db } from '@/lib/db';
import { usuarioDaSessao } from '@/lib/sessao';
import { paraCsv } from '@/lib/dominio/relatorios';
import { NOME_FORMA } from '@/lib/dominio/venda';
import { relatorioPeriodo } from '@/lib/servicos/relatorios';
import { lerPeriodo } from '@/lib/periodo';

const reais = (c: number) => (c / 100).toFixed(2).replace('.', ',');

export async function GET(req: Request) {
  const usuario = await usuarioDaSessao();
  if (!usuario) return new Response('Não autorizado', { status: 401 });
  if (usuario.papel !== 'ADMIN') return new Response('Só o administrador exporta relatórios', { status: 403 });

  const params = Object.fromEntries(new URL(req.url).searchParams);
  const { de, ate, inicio, fim } = lerPeriodo(params);
  let linhas: Record<string, string | number | null>[];

  if (params.tipo === 'produtos') {
    const r = await relatorioPeriodo(db, inicio, fim);
    linhas = r.produtos.map((p) => ({
      produto: p.nome,
      quantidade: p.quantidade,
      vendido: reais(p.total),
      custo: reais(p.custo),
      lucro: reais(p.total - p.custo),
    }));
  } else {
    const vendas = await db.venda.findMany({
      where: { criadoEm: { gte: inicio, lt: fim } },
      orderBy: { criadoEm: 'asc' },
      include: { vendedor: { select: { nome: true } }, cliente: { select: { nome: true } }, pagamentos: true },
    });
    linhas = vendas.map((v) => ({
      numero: v.numero,
      data: v.criadoEm.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      situacao: v.status === 'CONCLUIDA' ? 'Concluída' : 'Cancelada',
      vendedor: v.vendedor.nome,
      cliente: v.cliente?.nome ?? '',
      subtotal: reais(v.subtotal),
      desconto: reais(v.desconto),
      total: reais(v.total),
      pagamento: v.pagamentos.map((p) => `${NOME_FORMA[p.forma]} ${reais(p.valor)}`).join(' + '),
      troco: reais(v.troco),
    }));
  }

  // BOM no começo para o Excel abrir os acentos certinho
  return new Response(`﻿${paraCsv(linhas)}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="balcao-${params.tipo === 'produtos' ? 'produtos' : 'vendas'}-${de}-a-${ate}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
