import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { EsqueletoPagina } from '@/components/esqueleto';
import { AlertTriangle, Receipt, ShoppingCart, TrendingUp, Wallet } from 'lucide-react';
import { db } from '@/lib/db';
import { exigirUsuario } from '@/lib/dal';
import { dadosPainel } from '@/lib/servicos/relatorios';
import { caixaAberto } from '@/lib/servicos/caixa';
import { formatarReais, porcentagem } from '@/lib/dominio/dinheiro';
import { Aviso, Cabecalho, Cartao, Etiqueta, Indicador, LinkBotao, Vazio } from '@/components/ui';
import { GraficoVendasDia } from '@/components/graficos';

export const metadata: Metadata = { title: 'Painel' };

function variacao(hoje: number, ontem: number) {
  if (!ontem) return null;
  const v = porcentagem(hoje - ontem, ontem);
  return `${v >= 0 ? '+' : ''}${String(v).replace('.', ',')}% em relação a ontem`;
}

export default function Painel(props: PageProps<'/painel'>) {
  return (
    <Suspense fallback={<EsqueletoPagina />}>
      <ConteudoPainel {...props} />
    </Suspense>
  );
}

async function ConteudoPainel({ searchParams }: PageProps<'/painel'>) {
  const usuario = await exigirUsuario();
  const { aviso } = await searchParams;
  const [d, caixa] = await Promise.all([dadosPainel(db), caixaAberto(db)]);
  const saudacao = new Date().toLocaleString('pt-BR', { hour: 'numeric', timeZone: 'America/Sao_Paulo' });
  const hora = Number(saudacao);
  const ola = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <>
      <Cabecalho
        titulo={`${ola}, ${usuario.nome.split(' ')[0]}`}
        descricao={new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' })}
        acoes={<LinkBotao href="/pdv"><ShoppingCart size={16} /> Nova venda</LinkBotao>}
      />

      {aviso === 'sem-permissao' && <div className="mb-4"><Aviso>Essa área é só para o administrador.</Aviso></div>}
      {!caixa && (
        <div className="mb-4">
          <Aviso tipo="info">
            O caixa está fechado. <Link href="/caixa" className="font-medium underline">Abrir o caixa</Link> para começar a vender.
          </Aviso>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Vendido hoje" valor={formatarReais(d.hoje.faturamento)} detalhe={variacao(d.hoje.faturamento, d.ontem.faturamento)} icone={<TrendingUp size={18} />} />
        <Indicador titulo="Vendas" valor={d.hoje.vendas} detalhe={`${d.ontem.vendas} ontem`} icone={<Receipt size={18} />} />
        <Indicador titulo="Ticket médio" valor={formatarReais(d.hoje.ticket)} icone={<ShoppingCart size={18} />} />
        <Indicador
          titulo="Lucro bruto"
          valor={formatarReais(d.hoje.lucroBruto)}
          detalhe={d.hoje.faturamento ? `Margem de ${String(porcentagem(d.hoje.lucroBruto, d.hoje.faturamento)).replace('.', ',')}%` : undefined}
          icone={<Wallet size={18} />}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Cartao className="p-5 xl:col-span-2">
          <h2 className="font-semibold">Vendas dos últimos 14 dias</h2>
          <p className="mb-4 text-sm text-zinc-500">Só vendas concluídas (canceladas não entram).</p>
          <GraficoVendasDia dados={d.grafico} />
        </Cartao>

        <Cartao className="p-5">
          <h2 className="font-semibold">Mais vendidos</h2>
          <p className="mb-3 text-sm text-zinc-500">Últimos 14 dias, por faturamento.</p>
          {d.maisVendidos.length ? (
            <ol className="space-y-3">
              {d.maisVendidos.map((p, i) => (
                <li key={p.produtoId} className="flex items-center gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.nome}</p>
                    <p className="text-xs text-zinc-500">{p.quantidade} vendidos</p>
                  </div>
                  <span className="num text-sm font-medium">{formatarReais(p.total)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <Vazio titulo="Nenhuma venda ainda" />
          )}
        </Cartao>
      </div>

      <Cartao className="mt-6">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <h2 className="font-semibold">Estoque baixo</h2>
            {d.totalAlertas > 0 && <Etiqueta cor="amarelo">{d.totalAlertas}</Etiqueta>}
          </div>
          <Link href="/produtos?situacao=baixo" className="text-sm font-medium text-marca-700 hover:underline">
            Ver todos
          </Link>
        </div>
        {d.alertas.length ? (
          <ul className="divide-y divide-zinc-100">
            {d.alertas.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <Link href={`/produtos/${p.id}`} className="font-medium hover:underline">{p.nome}</Link>
                <span className="flex items-center gap-3">
                  <span className="num text-zinc-500">{p.estoque} {p.unidade} (mín. {p.estoqueMinimo})</span>
                  <Etiqueta cor={p.situacao === 'ZERADO' ? 'vermelho' : 'amarelo'}>{p.situacao === 'ZERADO' ? 'Sem estoque' : 'Baixo'}</Etiqueta>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Vazio titulo="Tudo certo com o estoque" />
        )}
      </Cartao>
    </>
  );
}
