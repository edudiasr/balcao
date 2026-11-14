import type { Metadata } from 'next';
import { Suspense } from 'react';
import { db } from '@/lib/db';
import { exigirAdmin } from '@/lib/dal';
import { Cabecalho, Cartao } from '@/components/ui';
import { EsqueletoPagina } from '@/components/esqueleto';
import { FormProduto } from '../form-produto';

export const metadata: Metadata = { title: 'Novo produto' };

export default function NovoProduto() {
  return (
    <Suspense fallback={<EsqueletoPagina />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  await exigirAdmin();
  const categorias = await db.categoria.findMany({ orderBy: { nome: 'asc' }, select: { id: true, nome: true } });
  return (
    <>
      <Cabecalho titulo="Novo produto" descricao="O código pode ser o código de barras da embalagem." />
      <Cartao className="max-w-3xl p-6">
        <FormProduto categorias={categorias} podeEditar />
      </Cartao>
    </>
  );
}
