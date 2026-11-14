import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/lib/db';
import { exigirUsuario } from '@/lib/dal';
import { formatarReais } from '@/lib/dominio/dinheiro';
import { diasAtras } from '@/lib/periodo';
import { NOME_MOVIMENTO, margemProduto, situacaoEstoque } from '@/lib/dominio/estoque';
import { Aviso, Cabecalho, Cartao, Etiqueta, LinkBotao, Tabela, Td, Th, Vazio } from '@/components/ui';
import { EsqueletoPagina } from '@/components/esqueleto';
import { FormProduto } from '../form-produto';
import { FormMovimento } from './form-movimento';

export const metadata: Metadata = { title: 'Produto' };

const dataHora = (d: Date) => d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });

export default function PaginaProduto(props: PageProps<'/produtos/[id]'>) {
  return (
    <Suspense fallback={<EsqueletoPagina />}>
      <Conteudo {...props} />
    </Suspense>
  );
}

async function Conteudo({ params, searchParams }: PageProps<'/produtos/[id]'>) {
  const usuario = await exigirUsuario();
  const { id } = await params;
  const { criado } = await searchParams;
  const [produto, categorias, movimentos, vendidos30] = await Promise.all([
    db.produto.findUnique({ where: { id } }),
    db.categoria.findMany({ orderBy: { nome: 'asc' }, select: { id: true, nome: true } }),
    db.movimentoEstoque.findMany({
      where: { produtoId: id },
      orderBy: { criadoEm: 'desc' },
      take: 25,
      include: { usuario: { select: { nome: true } }, venda: { select: { numero: true } } },
    }),
    db.itemVenda.aggregate({
      where: { produtoId: id, venda: { status: 'CONCLUIDA', criadoEm: { gte: diasAtras(30) } } },
      _sum: { quantidade: true },
    }),
  ]);
  if (!produto) notFound();

  const admin = usuario.papel === 'ADMIN';
  const sit = situacaoEstoque(produto.estoque, produto.estoqueMinimo);
  const porDia = (vendidos30._sum.quantidade ?? 0) / 30;
  const diasRestantes = porDia > 0 ? Math.floor(produto.estoque / porDia) : null;

  return (
    <>
      <LinkBotao href="/produtos" variante="fantasma" className="-ml-3 mb-2"><ArrowLeft size={16} /> Produtos</LinkBotao>
      <Cabecalho titulo={produto.nome} descricao={`Código ${produto.codigo}`} />
      {criado && <div className="mb-4"><Aviso tipo="ok">Produto cadastrado.</Aviso></div>}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Cartao className="p-6">
            <h2 className="mb-4 font-semibold">Dados do produto</h2>
            <FormProduto produto={produto} categorias={categorias} podeEditar={admin} />
            {!admin && <p className="mt-4 text-sm text-zinc-500">Só o administrador altera cadastro e preços.</p>}
          </Cartao>

          <Cartao>
            <h2 className="border-b border-zinc-200 px-5 py-4 font-semibold">Histórico de estoque</h2>
            {movimentos.length ? (
              <Tabela>
                <thead className="bg-zinc-50">
                  <tr>
                    <Th>Quando</Th>
                    <Th>Movimento</Th>
                    <Th className="text-right">Qtd.</Th>
                    <Th className="text-right">Saldo</Th>
                    <Th>Por</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {movimentos.map((m) => (
                    <tr key={m.id}>
                      <Td className="num text-zinc-500">{dataHora(m.criadoEm)}</Td>
                      <Td>
                        {NOME_MOVIMENTO[m.tipo]}
                        {m.venda && <span className="text-zinc-500"> · venda #{m.venda.numero}</span>}
                        {m.motivo && <p className="text-xs text-zinc-500">{m.motivo}</p>}
                      </Td>
                      <Td className={`num text-right font-medium ${m.quantidade > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {m.quantidade > 0 ? '+' : ''}{m.quantidade}
                      </Td>
                      <Td className="num text-right">{m.saldoApos}</Td>
                      <Td className="text-zinc-500">{m.usuario.nome.split(' ')[0]}</Td>
                    </tr>
                  ))}
                </tbody>
              </Tabela>
            ) : (
              <Vazio titulo="Sem movimentações" />
            )}
          </Cartao>
        </div>

        <div className="space-y-6">
          <Cartao className="p-5">
            <p className="text-sm text-zinc-500">Em estoque</p>
            <p className="num mt-1 text-3xl font-semibold">{produto.estoque} <span className="text-base font-normal text-zinc-500">{produto.unidade}</span></p>
            <div className="mt-2 flex items-center gap-2">
              <Etiqueta cor={sit === 'OK' ? 'verde' : sit === 'BAIXO' ? 'amarelo' : 'vermelho'}>{sit === 'OK' ? 'Normal' : sit === 'BAIXO' ? 'Estoque baixo' : 'Sem estoque'}</Etiqueta>
              <span className="text-xs text-zinc-500">mínimo {produto.estoqueMinimo}</span>
            </div>
            <dl className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-zinc-500">Vendidos (30 dias)</dt><dd className="num">{vendidos30._sum.quantidade ?? 0}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Dura mais ou menos</dt><dd className="num">{diasRestantes == null ? '—' : `${diasRestantes} dias`}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Margem</dt><dd className="num">{String(margemProduto(produto.precoCusto, produto.precoVenda)).replace('.', ',')}%</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Valor em estoque (custo)</dt><dd className="num">{formatarReais(produto.precoCusto * produto.estoque)}</dd></div>
            </dl>
          </Cartao>
          <Cartao className="p-5">
            <h2 className="mb-3 font-semibold">Movimentar estoque</h2>
            <FormMovimento produtoId={produto.id} saldo={produto.estoque} unidade={produto.unidade} admin={admin} />
          </Cartao>
        </div>
      </div>
    </>
  );
}
