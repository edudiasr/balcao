import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/lib/db';
import { exigirUsuario } from '@/lib/dal';
import { formatarReais } from '@/lib/dominio/dinheiro';
import { ticketMedio } from '@/lib/dominio/relatorios';
import { Cabecalho, Cartao, Etiqueta, LinkBotao, Tabela, Td, Th, Vazio } from '@/components/ui';
import { EsqueletoPagina } from '@/components/esqueleto';
import { FormCliente } from '../form-cliente';

export const metadata: Metadata = { title: 'Cliente' };

export default function PaginaCliente(props: PageProps<'/clientes/[id]'>) {
  return (
    <Suspense fallback={<EsqueletoPagina />}>
      <Conteudo {...props} />
    </Suspense>
  );
}

async function Conteudo({ params }: PageProps<'/clientes/[id]'>) {
  await exigirUsuario();
  const { id } = await params;
  const cliente = await db.cliente.findUnique({
    where: { id },
    include: { vendas: { orderBy: { criadoEm: 'desc' }, take: 30, include: { _count: { select: { itens: true } } } } },
  });
  if (!cliente) notFound();
  const concluidas = cliente.vendas.filter((v) => v.status === 'CONCLUIDA');
  const total = concluidas.reduce((s, v) => s + v.total, 0);

  return (
    <>
      <LinkBotao href="/clientes" variante="fantasma" className="-ml-3 mb-2"><ArrowLeft size={16} /> Clientes</LinkBotao>
      <Cabecalho titulo={cliente.nome} descricao={`Cliente desde ${cliente.criadoEm.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Cartao className="lg:col-span-2">
          <div className="grid grid-cols-3 divide-x divide-zinc-100 border-b border-zinc-200">
            <div className="p-4"><p className="text-xs text-zinc-500">Compras</p><p className="num text-xl font-semibold">{concluidas.length}</p></div>
            <div className="p-4"><p className="text-xs text-zinc-500">Total gasto</p><p className="num text-xl font-semibold">{formatarReais(total)}</p></div>
            <div className="p-4"><p className="text-xs text-zinc-500">Ticket médio</p><p className="num text-xl font-semibold">{formatarReais(ticketMedio(total, concluidas.length))}</p></div>
          </div>
          {cliente.vendas.length ? (
            <Tabela>
              <thead className="bg-zinc-50">
                <tr><Th>Venda</Th><Th>Data</Th><Th className="text-right">Itens</Th><Th className="text-right">Total</Th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {cliente.vendas.map((v) => (
                  <tr key={v.id}>
                    <Td><Link href={`/vendas/${v.id}`} className="font-medium hover:underline">#{v.numero}</Link> {v.status === 'CANCELADA' && <Etiqueta cor="vermelho">Cancelada</Etiqueta>}</Td>
                    <Td className="num text-zinc-500">{v.criadoEm.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })}</Td>
                    <Td className="num text-right">{v._count.itens}</Td>
                    <Td className="num text-right">{formatarReais(v.total)}</Td>
                  </tr>
                ))}
              </tbody>
            </Tabela>
          ) : (
            <Vazio titulo="Ainda não comprou" />
          )}
        </Cartao>
        <Cartao className="h-fit p-5">
          <h2 className="mb-4 font-semibold">Dados</h2>
          <FormCliente cliente={cliente} />
        </Cartao>
      </div>
    </>
  );
}
