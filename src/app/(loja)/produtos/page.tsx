import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { Prisma } from '@/generated/prisma/client';
import { db } from '@/lib/db';
import { exigirUsuario } from '@/lib/dal';
import { formatarReais } from '@/lib/dominio/dinheiro';
import { margemProduto, situacaoEstoque } from '@/lib/dominio/estoque';
import { Cabecalho, Cartao, Etiqueta, LinkBotao, Tabela, Td, Th, Vazio } from '@/components/ui';
import { EsqueletoPagina } from '@/components/esqueleto';
import { Paginacao } from '@/components/paginacao';

export const metadata: Metadata = { title: 'Produtos' };
const POR_PAGINA = 20;

export default function Produtos(props: PageProps<'/produtos'>) {
  return (
    <Suspense fallback={<EsqueletoPagina />}>
      <Conteudo {...props} />
    </Suspense>
  );
}

async function Conteudo({ searchParams }: PageProps<'/produtos'>) {
  const usuario = await exigirUsuario();
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim() : '';
  const categoria = typeof sp.categoria === 'string' ? sp.categoria : '';
  const situacao = typeof sp.situacao === 'string' ? sp.situacao : '';
  const pagina = Math.max(1, Number(sp.pagina) || 1);

  const where: Prisma.ProdutoWhereInput = {
    ativo: situacao === 'inativos' ? false : true,
    ...(q && { OR: [{ nome: { contains: q, mode: 'insensitive' } }, { codigo: { startsWith: q } }] }),
    ...(categoria && { categoriaId: categoria }),
  };

  // "estoque <= mínimo" compara duas colunas: o Prisma não faz isso no where, então filtra os ids por SQL
  if (situacao === 'baixo' || situacao === 'zerado') {
    const condicao = situacao === 'zerado' ? Prisma.sql`estoque <= 0` : Prisma.sql`estoque <= "estoqueMinimo"`;
    const ids = await db.$queryRaw<{ id: string }[]>`SELECT id FROM "Produto" WHERE ativo AND ${condicao}`;
    where.id = { in: ids.map((r) => r.id) };
  }

  const [produtos, total, categorias] = await Promise.all([
    db.produto.findMany({
      where,
      include: { categoria: { select: { nome: true } } },
      orderBy: situacao === 'baixo' ? { estoque: 'asc' } : { nome: 'asc' },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    db.produto.count({ where }),
    db.categoria.findMany({ orderBy: { nome: 'asc' } }),
  ]);

  return (
    <>
      <Cabecalho
        titulo="Produtos"
        descricao={`${total} produto${total === 1 ? '' : 's'}`}
        acoes={usuario.papel === 'ADMIN' && <LinkBotao href="/produtos/novo"><Plus size={16} /> Novo produto</LinkBotao>}
      />

      <Cartao>
        <form className="flex flex-wrap gap-3 border-b border-zinc-200 p-4">
          <label className="relative min-w-60 flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input name="q" defaultValue={q} placeholder="Buscar por nome ou código" className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-500/20" />
          </label>
          <select name="categoria" defaultValue={categoria} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            <option value="">Todas as categorias</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
          <select name="situacao" defaultValue={situacao} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            <option value="">Ativos</option>
            <option value="baixo">Estoque baixo</option>
            <option value="zerado">Sem estoque</option>
            <option value="inativos">Inativos</option>
          </select>
          <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">Filtrar</button>
        </form>

        {produtos.length ? (
          <Tabela>
            <thead className="bg-zinc-50">
              <tr>
                <Th>Produto</Th>
                <Th>Categoria</Th>
                <Th className="text-right">Custo</Th>
                <Th className="text-right">Venda</Th>
                <Th className="text-right">Margem</Th>
                <Th className="text-right">Estoque</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {produtos.map((p) => {
                const sit = situacaoEstoque(p.estoque, p.estoqueMinimo);
                return (
                  <tr key={p.id} className="hover:bg-zinc-50">
                    <Td>
                      <Link href={`/produtos/${p.id}`} className="font-medium text-zinc-900 hover:underline">{p.nome}</Link>
                      <p className="num text-xs text-zinc-500">{p.codigo}</p>
                    </Td>
                    <Td>{p.categoria?.nome ?? <span className="text-zinc-400">—</span>}</Td>
                    <Td className="num text-right">{formatarReais(p.precoCusto)}</Td>
                    <Td className="num text-right font-medium">{formatarReais(p.precoVenda)}</Td>
                    <Td className="num text-right">{String(margemProduto(p.precoCusto, p.precoVenda)).replace('.', ',')}%</Td>
                    <Td className="text-right">
                      <span className="num mr-2">{p.estoque} {p.unidade}</span>
                      {sit !== 'OK' && <Etiqueta cor={sit === 'ZERADO' ? 'vermelho' : 'amarelo'}>{sit === 'ZERADO' ? 'Zerado' : 'Baixo'}</Etiqueta>}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Tabela>
        ) : (
          <Vazio titulo="Nenhum produto encontrado">Tente outra busca ou limpe os filtros.</Vazio>
        )}
        <Paginacao pagina={pagina} total={total} porPagina={POR_PAGINA} params={{ q, categoria, situacao }} />
      </Cartao>
    </>
  );
}
