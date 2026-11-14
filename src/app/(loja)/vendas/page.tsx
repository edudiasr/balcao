import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import type { Prisma } from '@/generated/prisma/client';
import { db } from '@/lib/db';
import { exigirUsuario } from '@/lib/dal';
import { formatarReais } from '@/lib/dominio/dinheiro';
import { NOME_FORMA } from '@/lib/dominio/venda';
import { inicioDoDia, somarDias } from '@/lib/servicos/relatorios';
import { Cabecalho, Cartao, Etiqueta, Tabela, Td, Th, Vazio } from '@/components/ui';
import { EsqueletoPagina } from '@/components/esqueleto';
import { Paginacao } from '@/components/paginacao';

export const metadata: Metadata = { title: 'Vendas' };
const POR_PAGINA = 25;

export default function Vendas(props: PageProps<'/vendas'>) {
  return (
    <Suspense fallback={<EsqueletoPagina />}>
      <Conteudo {...props} />
    </Suspense>
  );
}

const dataValida = (s: unknown) => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '');

async function Conteudo({ searchParams }: PageProps<'/vendas'>) {
  await exigirUsuario();
  const sp = await searchParams;
  const hoje = inicioDoDia(new Date());
  const de = dataValida(sp.de) || hoje.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const ate = dataValida(sp.ate) || de;
  const status = sp.status === 'CANCELADA' || sp.status === 'CONCLUIDA' ? sp.status : '';
  const vendedor = typeof sp.vendedor === 'string' ? sp.vendedor : '';
  const pagina = Math.max(1, Number(sp.pagina) || 1);

  const where: Prisma.VendaWhereInput = {
    criadoEm: { gte: new Date(`${de}T00:00:00-03:00`), lt: somarDias(new Date(`${ate}T00:00:00-03:00`), 1) },
    ...(status && { status }),
    ...(vendedor && { vendedorId: vendedor }),
  };

  const [vendas, total, soma, vendedores] = await Promise.all([
    db.venda.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        vendedor: { select: { nome: true } },
        cliente: { select: { nome: true } },
        pagamentos: { select: { forma: true } },
        _count: { select: { itens: true } },
      },
    }),
    db.venda.count({ where }),
    db.venda.aggregate({ where: { ...where, status: 'CONCLUIDA' }, _sum: { total: true }, _count: true }),
    db.usuario.findMany({ select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
  ]);

  return (
    <>
      <Cabecalho
        titulo="Vendas"
        descricao={`${soma._count} concluída${soma._count === 1 ? '' : 's'} · ${formatarReais(soma._sum.total ?? 0)} no período`}
      />
      <Cartao>
        <form className="flex flex-wrap items-end gap-3 border-b border-zinc-200 p-4 text-sm">
          <label>
            <span className="mb-1 block text-xs font-medium text-zinc-500">De</span>
            <input type="date" name="de" defaultValue={de} className="rounded-lg border border-zinc-300 px-3 py-2" />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-zinc-500">Até</span>
            <input type="date" name="ate" defaultValue={ate} className="rounded-lg border border-zinc-300 px-3 py-2" />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-zinc-500">Situação</span>
            <select name="status" defaultValue={status} className="rounded-lg border border-zinc-300 px-3 py-2">
              <option value="">Todas</option>
              <option value="CONCLUIDA">Concluídas</option>
              <option value="CANCELADA">Canceladas</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-zinc-500">Vendedor</span>
            <select name="vendedor" defaultValue={vendedor} className="rounded-lg border border-zinc-300 px-3 py-2">
              <option value="">Todos</option>
              {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
            </select>
          </label>
          <button className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-800">Filtrar</button>
        </form>

        {vendas.length ? (
          <Tabela>
            <thead className="bg-zinc-50">
              <tr>
                <Th>Venda</Th>
                <Th>Horário</Th>
                <Th>Vendedor</Th>
                <Th>Cliente</Th>
                <Th>Pagamento</Th>
                <Th className="text-right">Itens</Th>
                <Th className="text-right">Total</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {vendas.map((v) => (
                <tr key={v.id} className={`hover:bg-zinc-50 ${v.status === 'CANCELADA' ? 'text-zinc-400' : ''}`}>
                  <Td>
                    <Link href={`/vendas/${v.id}`} className="font-medium text-zinc-900 hover:underline">#{v.numero}</Link>{' '}
                    {v.status === 'CANCELADA' && <Etiqueta cor="vermelho">Cancelada</Etiqueta>}
                  </Td>
                  <Td className="num">{v.criadoEm.toLocaleString('pt-BR', { dateStyle: de === ate ? undefined : 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })}</Td>
                  <Td>{v.vendedor.nome.split(' ')[0]}</Td>
                  <Td>{v.cliente?.nome ?? <span className="text-zinc-400">—</span>}</Td>
                  <Td>{[...new Set(v.pagamentos.map((p) => NOME_FORMA[p.forma]))].join(' + ')}</Td>
                  <Td className="num text-right">{v._count.itens}</Td>
                  <Td className={`num text-right font-medium ${v.status === 'CANCELADA' ? 'line-through' : ''}`}>{formatarReais(v.total)}</Td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        ) : (
          <Vazio titulo="Nenhuma venda nesse período" />
        )}
        <Paginacao pagina={pagina} total={total} porPagina={POR_PAGINA} params={{ de, ate, status, vendedor }} />
      </Cartao>
    </>
  );
}
