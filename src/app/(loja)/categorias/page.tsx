import type { Metadata } from 'next';
import { Suspense } from 'react';
import { db } from '@/lib/db';
import { exigirUsuario } from '@/lib/dal';
import { Cabecalho, Cartao, Vazio } from '@/components/ui';
import { EsqueletoPagina } from '@/components/esqueleto';
import { LinhaCategoria, NovaCategoria } from './forms';

export const metadata: Metadata = { title: 'Categorias' };

export default function Categorias() {
  return (
    <Suspense fallback={<EsqueletoPagina />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  const usuario = await exigirUsuario();
  const admin = usuario.papel === 'ADMIN';
  const categorias = await db.categoria.findMany({ orderBy: { nome: 'asc' }, include: { _count: { select: { produtos: true } } } });
  return (
    <>
      <Cabecalho titulo="Categorias" descricao="Organizam a lista de produtos e o relatório de vendas por categoria." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Cartao className="divide-y divide-zinc-100 lg:col-span-2">
          {categorias.length ? (
            categorias.map((c) => <LinhaCategoria key={c.id} id={c.id} nome={c.nome} produtos={c._count.produtos} admin={admin} />)
          ) : (
            <Vazio titulo="Nenhuma categoria ainda" />
          )}
        </Cartao>
        {admin && (
          <Cartao className="h-fit p-5">
            <h2 className="mb-3 font-semibold">Nova categoria</h2>
            <NovaCategoria />
          </Cartao>
        )}
      </div>
    </>
  );
}
