import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { db } from '@/lib/db';
import { exigirUsuario } from '@/lib/dal';
import { caixaAberto } from '@/lib/servicos/caixa';
import { Cartao, LinkBotao } from '@/components/ui';
import { EsqueletoPagina } from '@/components/esqueleto';
import { Pdv } from './pdv';

export const metadata: Metadata = { title: 'Frente de caixa' };

export default function PaginaPdv() {
  return (
    <Suspense fallback={<EsqueletoPagina />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  const usuario = await exigirUsuario();
  const caixa = await caixaAberto(db);
  if (!caixa) {
    return (
      <Cartao className="mx-auto mt-10 max-w-md p-8 text-center">
        <Wallet className="mx-auto text-zinc-400" size={36} />
        <h1 className="mt-3 text-lg font-semibold">O caixa está fechado</h1>
        <p className="mt-1 text-sm text-zinc-500">Abra o caixa informando o troco da gaveta para começar a vender.</p>
        <LinkBotao href="/caixa" className="mt-5">Abrir caixa</LinkBotao>
      </Cartao>
    );
  }

  // Loja pequena: algumas centenas de produtos cabem tranquilamente na tela e a busca fica instantânea.
  // Com milhares, trocaria por uma busca no servidor (route handler com debounce).
  const [produtos, clientes] = await Promise.all([
    db.produto.findMany({
      where: { ativo: true },
      select: { id: true, codigo: true, nome: true, precoVenda: true, estoque: true, unidade: true },
      orderBy: { nome: 'asc' },
    }),
    db.cliente.findMany({ select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
  ]);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Frente de caixa</h1>
        <p className="text-sm text-zinc-500">
          Caixa aberto por {caixa.abertoPor.nome.split(' ')[0]} · <Link href="/caixa" className="underline">ver caixa</Link>
        </p>
      </div>
      <Pdv produtos={produtos} clientes={clientes} papel={usuario.papel} />
    </>
  );
}
