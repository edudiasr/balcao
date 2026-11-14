import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/lib/db';
import { exigirUsuario } from '@/lib/dal';
import { formatarReais } from '@/lib/dominio/dinheiro';
import { NOME_FORMA } from '@/lib/dominio/venda';
import { Aviso, Cartao, Etiqueta, LinkBotao } from '@/components/ui';
import { EsqueletoPagina } from '@/components/esqueleto';
import { BotaoImprimir } from '@/components/imprimir';
import { FormCancelar } from './form-cancelar';

export const metadata: Metadata = { title: 'Venda' };

const dataHora = (d: Date) => d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });

export default function PaginaVenda(props: PageProps<'/vendas/[id]'>) {
  return (
    <Suspense fallback={<EsqueletoPagina />}>
      <Conteudo {...props} />
    </Suspense>
  );
}

async function Conteudo({ params }: PageProps<'/vendas/[id]'>) {
  const usuario = await exigirUsuario();
  const { id } = await params;
  const venda = await db.venda.findUnique({
    where: { id },
    include: {
      itens: true,
      pagamentos: true,
      vendedor: { select: { nome: true } },
      cliente: { select: { id: true, nome: true } },
      canceladaPor: { select: { nome: true } },
      caixa: { select: { status: true } },
    },
  });
  if (!venda) notFound();
  const podeCancelar = usuario.papel === 'ADMIN' && venda.status === 'CONCLUIDA' && venda.caixa.status === 'ABERTO';

  return (
    <>
      <div className="print:hidden">
        <LinkBotao href="/vendas" variante="fantasma" className="-ml-3 mb-2"><ArrowLeft size={16} /> Vendas</LinkBotao>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* comprovante (imprime só ele) */}
        <Cartao className="p-6 lg:col-span-2 print:border-0 print:shadow-none">
          <div className="flex items-start justify-between border-b border-dashed border-zinc-300 pb-4">
            <div>
              <h1 className="text-xl font-semibold">Venda #{venda.numero}</h1>
              <p className="num text-sm text-zinc-500">{dataHora(venda.criadoEm)} · vendedor {venda.vendedor.nome}</p>
              {venda.cliente && (
                <p className="text-sm text-zinc-500">Cliente: <Link href={`/clientes/${venda.cliente.id}`} className="underline">{venda.cliente.nome}</Link></p>
              )}
            </div>
            {venda.status === 'CANCELADA' ? <Etiqueta cor="vermelho">Cancelada</Etiqueta> : <Etiqueta cor="verde">Concluída</Etiqueta>}
          </div>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="pb-2 font-semibold">Produto</th>
                <th className="pb-2 text-right font-semibold">Qtd.</th>
                <th className="pb-2 text-right font-semibold">Unitário</th>
                <th className="pb-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {venda.itens.map((i) => (
                <tr key={i.id} className="border-t border-zinc-100">
                  <td className="py-2">{i.nomeProduto}</td>
                  <td className="num py-2 text-right">{i.quantidade}</td>
                  <td className="num py-2 text-right">{formatarReais(i.precoUnitario)}</td>
                  <td className="num py-2 text-right">{formatarReais(i.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="ml-auto mt-4 max-w-xs space-y-1 border-t border-dashed border-zinc-300 pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-zinc-500">Subtotal</dt><dd className="num">{formatarReais(venda.subtotal)}</dd></div>
            {venda.desconto > 0 && <div className="flex justify-between"><dt className="text-zinc-500">Desconto</dt><dd className="num">- {formatarReais(venda.desconto)}</dd></div>}
            <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd className="num">{formatarReais(venda.total)}</dd></div>
            {venda.pagamentos.map((p) => (
              <div key={p.id} className="flex justify-between"><dt className="text-zinc-500">{NOME_FORMA[p.forma]}</dt><dd className="num">{formatarReais(p.valor)}</dd></div>
            ))}
            {venda.troco > 0 && <div className="flex justify-between"><dt className="text-zinc-500">Troco</dt><dd className="num">{formatarReais(venda.troco)}</dd></div>}
          </dl>
          <p className="mt-6 text-center text-xs text-zinc-400">Documento sem valor fiscal</p>
        </Cartao>

        <div className="space-y-4 print:hidden">
          <Cartao className="space-y-3 p-5">
            <BotaoImprimir />
            {podeCancelar && <FormCancelar vendaId={venda.id} />}
            {venda.status === 'CONCLUIDA' && !podeCancelar && usuario.papel === 'ADMIN' && (
              <p className="text-xs text-zinc-500">O caixa dessa venda já foi fechado, então ela não pode mais ser cancelada aqui.</p>
            )}
          </Cartao>
          {venda.status === 'CANCELADA' && (
            <Aviso>
              Cancelada por {venda.canceladaPor?.nome} em {venda.canceladaEm && dataHora(venda.canceladaEm)}.
              <br />Motivo: {venda.motivoCancelamento}
            </Aviso>
          )}
        </div>
      </div>
    </>
  );
}
