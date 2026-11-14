import type { Metadata } from 'next';
import { Suspense } from 'react';
import { db } from '@/lib/db';
import { exigirUsuario } from '@/lib/dal';
import { formatarReais } from '@/lib/dominio/dinheiro';
import { NOME_FORMA, type FormaPagamento } from '@/lib/dominio/venda';
import { caixaAberto, resumoDoCaixa } from '@/lib/servicos/caixa';
import { Cabecalho, Cartao, Etiqueta, Tabela, Td, Th, Vazio } from '@/components/ui';
import { EsqueletoPagina } from '@/components/esqueleto';
import { FormAbrir, FormFechar, FormMovimento } from './forms';

export const metadata: Metadata = { title: 'Caixa' };

const dataHora = (d: Date) => d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
const hora = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

export default function Caixa() {
  return (
    <Suspense fallback={<EsqueletoPagina />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  await exigirUsuario();
  const [aberto, historico] = await Promise.all([
    caixaAberto(db),
    db.caixa.findMany({
      where: { status: 'FECHADO' },
      orderBy: { abertoEm: 'desc' },
      take: 10,
      include: { fechadoPor: { select: { nome: true } }, _count: { select: { vendas: { where: { status: 'CONCLUIDA' } } } } },
    }),
  ]);
  const detalhe = aberto ? await resumoDoCaixa(db, aberto.id) : null;

  return (
    <>
      <Cabecalho titulo="Caixa" descricao="Abertura, sangrias e fechamento conferido da gaveta." />

      {!aberto || !detalhe ? (
        <Cartao className="max-w-md p-6">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="font-semibold">Caixa fechado</h2>
            <Etiqueta>Fechado</Etiqueta>
          </div>
          <FormAbrir />
        </Cartao>
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Cartao className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">Caixa aberto</h2>
                  <Etiqueta cor="verde">Aberto</Etiqueta>
                </div>
                <p className="text-sm text-zinc-500">por {aberto.abertoPor.nome} às {hora(aberto.abertoEm)} ({aberto.abertoEm.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })})</p>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div><p className="text-xs text-zinc-500">Vendas</p><p className="num text-xl font-semibold">{detalhe.resumo.qtdVendas}</p></div>
                <div><p className="text-xs text-zinc-500">Total vendido</p><p className="num text-xl font-semibold">{formatarReais(detalhe.resumo.totalVendido)}</p></div>
                <div><p className="text-xs text-zinc-500">Dinheiro esperado na gaveta</p><p className="num text-xl font-semibold text-marca-700">{formatarReais(detalhe.resumo.dinheiroEsperado)}</p></div>
              </div>
              <dl className="mt-5 grid gap-x-8 gap-y-1.5 border-t border-zinc-100 pt-4 text-sm sm:grid-cols-2">
                <div className="flex justify-between"><dt className="text-zinc-500">Troco inicial</dt><dd className="num">{formatarReais(aberto.valorAbertura)}</dd></div>
                {(Object.keys(NOME_FORMA) as FormaPagamento[]).map((f) => (
                  <div key={f} className="flex justify-between"><dt className="text-zinc-500">Recebido em {NOME_FORMA[f].toLowerCase()}</dt><dd className="num">{formatarReais(detalhe.resumo.porForma[f])}</dd></div>
                ))}
                <div className="flex justify-between"><dt className="text-zinc-500">Troco devolvido</dt><dd className="num">- {formatarReais(detalhe.resumo.troco)}</dd></div>
                <div className="flex justify-between"><dt className="text-zinc-500">Suprimentos</dt><dd className="num">+ {formatarReais(detalhe.resumo.suprimentos)}</dd></div>
                <div className="flex justify-between"><dt className="text-zinc-500">Sangrias</dt><dd className="num">- {formatarReais(detalhe.resumo.sangrias)}</dd></div>
              </dl>
            </Cartao>

            <Cartao>
              <h2 className="border-b border-zinc-200 px-5 py-4 font-semibold">Movimentos da gaveta</h2>
              {detalhe.caixa.movimentos.length ? (
                <ul className="divide-y divide-zinc-100 text-sm">
                  {detalhe.caixa.movimentos.map((m) => (
                    <li key={m.id} className="flex items-center justify-between px-5 py-3">
                      <span>
                        <Etiqueta cor={m.tipo === 'SANGRIA' ? 'amarelo' : 'azul'}>{m.tipo === 'SANGRIA' ? 'Sangria' : 'Suprimento'}</Etiqueta>
                        <span className="ml-2">{m.motivo}</span>
                        <span className="ml-2 text-xs text-zinc-400">{hora(m.criadoEm)} · {m.usuario.nome.split(' ')[0]}</span>
                      </span>
                      <span className="num font-medium">{formatarReais(m.valor)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Vazio titulo="Nenhuma sangria ou suprimento" />
              )}
            </Cartao>
          </div>

          <div className="space-y-6">
            <Cartao className="p-5">
              <h2 className="mb-3 font-semibold">Sangria / suprimento</h2>
              <FormMovimento />
            </Cartao>
            <Cartao className="p-5">
              <h2 className="mb-1 font-semibold">Fechar caixa</h2>
              <p className="mb-3 text-sm text-zinc-500">Conte o dinheiro da gaveta. O sistema compara com o esperado.</p>
              <FormFechar esperado={detalhe.resumo.dinheiroEsperado} />
            </Cartao>
          </div>
        </div>
      )}

      <Cartao className="mt-6">
        <h2 className="border-b border-zinc-200 px-5 py-4 font-semibold">Últimos fechamentos</h2>
        {historico.length ? (
          <Tabela>
            <thead className="bg-zinc-50">
              <tr><Th>Abertura</Th><Th>Fechamento</Th><Th className="text-right">Vendas</Th><Th className="text-right">Esperado</Th><Th className="text-right">Contado</Th><Th className="text-right">Diferença</Th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {historico.map((c) => {
                const dif = (c.valorContado ?? 0) - (c.valorEsperado ?? 0);
                return (
                  <tr key={c.id}>
                    <Td className="num">{dataHora(c.abertoEm)}</Td>
                    <Td className="num">{c.fechadoEm && hora(c.fechadoEm)} <span className="text-zinc-400">· {c.fechadoPor?.nome.split(' ')[0]}</span></Td>
                    <Td className="num text-right">{c._count.vendas}</Td>
                    <Td className="num text-right">{formatarReais(c.valorEsperado ?? 0)}</Td>
                    <Td className="num text-right">{formatarReais(c.valorContado ?? 0)}</Td>
                    <Td className={`num text-right font-medium ${dif === 0 ? 'text-zinc-500' : dif > 0 ? 'text-sky-700' : 'text-red-600'}`} title={c.observacao ?? undefined}>
                      {dif === 0 ? 'ok' : `${dif > 0 ? '+' : '-'}${formatarReais(Math.abs(dif))}`}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Tabela>
        ) : (
          <Vazio titulo="Nenhum caixa fechado ainda" />
        )}
      </Cartao>
    </>
  );
}
