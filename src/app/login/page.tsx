import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { Store } from 'lucide-react';
import { usuarioAtual } from '@/lib/dal';
import { FormLogin } from './form-login';

export const metadata: Metadata = { title: 'Entrar' };

export default function Login({ searchParams }: PageProps<'/login'>) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-zinc-900 p-12 text-zinc-100 lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Store className="text-marca-500" /> Balcão
        </div>
        <div>
          <p className="text-3xl font-semibold leading-tight">
            Vendas, estoque e caixa
            <br />
            da sua loja num lugar só.
          </p>
          <p className="mt-4 max-w-md text-zinc-400">
            Frente de caixa rápida, controle de estoque com histórico de cada movimento e fechamento de caixa conferido.
          </p>
        </div>
        <p className="text-sm text-zinc-500">Projeto de portfólio · Next.js, TypeScript e PostgreSQL</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 text-lg font-semibold lg:hidden">
            <Store className="text-marca-600" /> Balcão
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
          <p className="mb-6 mt-1 text-sm text-zinc-500">Use a conta que o administrador da loja criou para você.</p>
          <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-zinc-100" />}>
            <Formulario searchParams={searchParams} />
          </Suspense>
          <div className="mt-8 rounded-lg border border-dashed border-zinc-300 p-3 text-xs text-zinc-500">
            <p className="font-medium text-zinc-600">Contas de demonstração</p>
            <p className="mt-1">admin@balcao.dev · vendedor@balcao.dev</p>
            <p>senha: demo1234</p>
          </div>
        </div>
      </section>
    </main>
  );
}

async function Formulario({ searchParams }: { searchParams: PageProps<'/login'>['searchParams'] }) {
  // quem já está logado não precisa ver o login
  if (await usuarioAtual()) redirect('/painel');
  const { voltar } = await searchParams;
  return <FormLogin voltar={typeof voltar === 'string' ? voltar : undefined} />;
}
