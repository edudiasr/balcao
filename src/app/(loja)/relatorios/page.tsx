import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { db } from '@/lib/db';
import { exigirAdmin } from '@/lib/dal';
import { formatarReais, porcentagem } from '@/lib/dominio/dinheiro';
import { NOME_FORMA, type FormaPagamento } from '@/lib/dominio/venda';
import { relatorioPeriodo } from '@/lib/servicos/relatorios';
import { atalhosPeriodo, lerPeriodo } from '@/lib/periodo';
import { Cabecalho, Cartao, Indicador, Tabela, Td, Th, Vazio } from '@/components/ui';
import { EsqueletoPagina } from '@/components/esqueleto';
import { CORES, GraficoPizza, GraficoVendasDia } from '@/components/graficos';

export const metadata: Metadata = { title: 'Relatórios' };

const pct = (v: number) => `${String(v).replace('.', ',')}%`;

export default function Relatorios(props: PageProps<'/relatorios'>) {
  return (
    <Suspense fallback={<EsqueletoPagina />}>
      <Conteudo {...props} />
    </Suspense>
  );
}

async function Conteudo({ searchParams }: PageProps<'/relatorios'>) {
  await exigirAdmin();
  const { de, ate, inicio, fim } = lerPeriodo(await searchParams);
  const r = await relatorioPeriodo(db, inicio, fim);
  const formas = (Object.keys(NOME_FORMA) as FormaPagamento[]).map((f) => ({ nome: NOME_FORMA[f], valor: r.porForma[f] }));
  const totalFormas = formas.reduce((s, f) => s + f.valor, 0);

  return (
    <>
      <Cabecalho
        titulo="Relatórios"
        descricao={`De ${new Date(`${de}T12:00:00`).toLocaleDateString('pt-BR')} a ${new Date(`${ate}T12:00:00`).toLocaleDateString('pt-BR')}`}
        acoes={
          <>
            <a href={`/relatorios/csv?tipo=vendas&de=${de}&ate=${ate}`} className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium shadow-sm hover:bg-zinc-50">
              <Download size={16} /> Vendas (CSV)
            </a>
            <a href={`/relatorios/csv?tipo=produtos&de=${de}&ate=${ate}`} className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium shadow-sm hover:bg-zinc-50">
              <Download size={16} /> Produtos (CSV)
            </a>
          </>
        }
      />

      <Cartao className="mb-6 flex flex-wrap items-end gap-3 p-4 text-sm">
        <div className="flex flex-wrap gap-1.5">
          {atalhosPeriodo().map((a) => (
            <Link
              key={a.rotulo}
              href={`?de=${a.de}&ate=${a.ate}`}
              className={`rounded-lg border px-3 py-2 font-medium ${a.de === de && a.ate === ate ? 'border-marca-600 bg-marca-50 text-marca-700' : 'border-zinc-300 hover:bg-zinc-50'}`}
            >
              {a.rotulo}
            </Link>
          ))}
        </div>
        <form className="flex flex-wrap items-end gap-2">
          <input type="date" name="de" defaultValue={de} aria-label="Data inicial" className="rounded-lg border border-zinc-300 px-3 py-2" />
          <input type="date" name="ate" defaultValue={ate} aria-label="Data final" className="rounded-lg border border-zinc-300 px-3 py-2" />
          <button className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-800">Aplicar</button>
        </form>
      </Cartao>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Faturamento" valor={formatarReais(r.faturamento)} detalhe={`${r.vendas} vendas`} />
        <Indicador titulo="Ticket médio" valor={formatarReais(r.ticket)} />
        <Indicador titulo="Lucro bruto" valor={formatarReais(r.lucroBruto)} detalhe={`Margem ${pct(porcentagem(r.lucroBruto, r.faturamento))} · custo ${formatarReais(r.custo)}`} />
        <Indicador titulo="Descontos dados" valor={formatarReais(r.descontos)} detalhe={`${pct(porcentagem(r.descontos, r.faturamento + r.descontos))} do bruto`} />
      </div>

      {r.vendas === 0 ? (
        <Cartao className="mt-6"><Vazio titulo="Nenhuma venda no período" /></Cartao>
      ) : (
        <>
          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Cartao className="p-5 xl:col-span-2">
              <h2 className="mb-4 font-semibold">Vendas por dia</h2>
              <GraficoVendasDia dados={r.porDia} />
            </Cartao>
            <Cartao className="p-5">
              <h2 className="font-semibold">Formas de pagamento</h2>
              <GraficoPizza dados={formas} />
              <ul className="space-y-1.5 text-sm">
                {formas.map((f, i) => (
                  <li key={f.nome} className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: CORES[i] }} />{f.nome}</span>
                    <span className="num">{formatarReais(f.valor)} <span className="text-zinc-400">({pct(porcentagem(f.valor, totalFormas))})</span></span>
                  </li>
                ))}
              </ul>
            </Cartao>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <Cartao>
              <h2 className="border-b border-zinc-200 px-5 py-4 font-semibold">Por categoria</h2>
              <Tabela>
                <thead className="bg-zinc-50"><tr><Th>Categoria</Th><Th className="text-right">Itens</Th><Th className="text-right">Vendido</Th><Th className="text-right">%</Th></tr></thead>
                <tbody className="divide-y divide-zinc-100">
                  {r.porCategoria.map((c) => (
                    <tr key={c.nome}><Td>{c.nome}</Td><Td className="num text-right">{c.quantidade}</Td><Td className="num text-right">{formatarReais(c.total)}</Td><Td className="num text-right text-zinc-500">{pct(porcentagem(c.total, r.faturamento + r.descontos))}</Td></tr>
                  ))}
                </tbody>
              </Tabela>
            </Cartao>
            <Cartao>
              <h2 className="border-b border-zinc-200 px-5 py-4 font-semibold">Por vendedor</h2>
              <Tabela>
                <thead className="bg-zinc-50"><tr><Th>Vendedor</Th><Th className="text-right">Vendas</Th><Th className="text-right">Total</Th><Th className="text-right">Ticket</Th></tr></thead>
                <tbody className="divide-y divide-zinc-100">
                  {r.porVendedor.map((v) => (
                    <tr key={v.nome}><Td>{v.nome}</Td><Td className="num text-right">{v.vendas}</Td><Td className="num text-right">{formatarReais(v.total)}</Td><Td className="num text-right">{formatarReais(Math.round(v.total / v.vendas))}</Td></tr>
                  ))}
                </tbody>
              </Tabela>
            </Cartao>
          </div>

          <Cartao className="mt-6">
            <h2 className="border-b border-zinc-200 px-5 py-4 font-semibold">Produtos vendidos</h2>
            <Tabela>
              <thead className="bg-zinc-50"><tr><Th>Produto</Th><Th className="text-right">Qtd.</Th><Th className="text-right">Vendido</Th><Th className="text-right">Custo</Th><Th className="text-right">Lucro</Th><Th className="text-right">Margem</Th></tr></thead>
              <tbody className="divide-y divide-zinc-100">
                {r.produtos.slice(0, 50).map((p) => (
                  <tr key={p.produtoId}>
                    <Td><Link href={`/produtos/${p.produtoId}`} className="hover:underline">{p.nome}</Link></Td>
                    <Td className="num text-right">{p.quantidade}</Td>
                    <Td className="num text-right">{formatarReais(p.total)}</Td>
                    <Td className="num text-right text-zinc-500">{formatarReais(p.custo)}</Td>
                    <Td className="num text-right">{formatarReais(p.total - p.custo)}</Td>
                    <Td className="num text-right">{pct(porcentagem(p.total - p.custo, p.total))}</Td>
                  </tr>
                ))}
              </tbody>
            </Tabela>
            {r.produtos.length > 50 && <p className="border-t border-zinc-100 px-5 py-3 text-sm text-zinc-500">Mostrando os 50 primeiros de {r.produtos.length}. A lista completa está no CSV.</p>}
          </Cartao>
        </>
      )}
    </>
  );
}
