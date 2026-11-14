import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { db } from '@/lib/db';
import { exigirUsuario } from '@/lib/dal';
import { formatarReais } from '@/lib/dominio/dinheiro';
import { formatarDocumento, formatarTelefone, soDigitos } from '@/lib/dominio/documento';
import { Cabecalho, Cartao, Tabela, Td, Th, Vazio } from '@/components/ui';
import { EsqueletoPagina } from '@/components/esqueleto';
import { FormCliente } from './form-cliente';

export const metadata: Metadata = { title: 'Clientes' };

export default function Clientes(props: PageProps<'/clientes'>) {
  return (
    <Suspense fallback={<EsqueletoPagina />}>
      <Conteudo {...props} />
    </Suspense>
  );
}

async function Conteudo({ searchParams }: PageProps<'/clientes'>) {
  await exigirUsuario();
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim() : '';
  const digitos = soDigitos(q);
  const clientes = await db.cliente.findMany({
    where: q
      ? { OR: [{ nome: { contains: q, mode: 'insensitive' } }, ...(digitos ? [{ telefone: { contains: digitos } }, { documento: { startsWith: digitos } }] : [])] }
      : undefined,
    orderBy: { nome: 'asc' },
    take: 100,
    include: { vendas: { where: { status: 'CONCLUIDA' }, select: { total: true, criadoEm: true }, orderBy: { criadoEm: 'desc' } } },
  });

  return (
    <>
      <Cabecalho titulo="Clientes" descricao="Cadastro opcional: dá para vender sem cliente." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Cartao className="lg:col-span-2">
          <form className="border-b border-zinc-200 p-4">
            <label className="relative block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input name="q" defaultValue={q} placeholder="Buscar por nome, telefone ou CPF" className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-500/20" />
            </label>
          </form>
          {clientes.length ? (
            <Tabela>
              <thead className="bg-zinc-50">
                <tr>
                  <Th>Cliente</Th>
                  <Th>Contato</Th>
                  <Th className="text-right">Compras</Th>
                  <Th className="text-right">Total gasto</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {clientes.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50">
                    <Td>
                      <Link href={`/clientes/${c.id}`} className="font-medium text-zinc-900 hover:underline">{c.nome}</Link>
                      {c.documento && <p className="num text-xs text-zinc-500">{formatarDocumento(c.documento)}</p>}
                    </Td>
                    <Td className="num">{formatarTelefone(c.telefone) || <span className="text-zinc-400">—</span>}</Td>
                    <Td className="num text-right">{c.vendas.length}</Td>
                    <Td className="num text-right">{formatarReais(c.vendas.reduce((s, v) => s + v.total, 0))}</Td>
                  </tr>
                ))}
              </tbody>
            </Tabela>
          ) : (
            <Vazio titulo={q ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'} />
          )}
        </Cartao>
        <Cartao className="h-fit p-5">
          <h2 className="mb-4 font-semibold">Novo cliente</h2>
          <FormCliente />
        </Cartao>
      </div>
    </>
  );
}
