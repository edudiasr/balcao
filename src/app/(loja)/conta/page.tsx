import type { Metadata } from 'next';
import { Suspense } from 'react';
import { exigirUsuario } from '@/lib/dal';
import { Cabecalho, Cartao } from '@/components/ui';
import { EsqueletoPagina } from '@/components/esqueleto';
import { FormSenha } from './form-senha';

export const metadata: Metadata = { title: 'Minha senha' };

export default function Conta() {
  return (
    <Suspense fallback={<EsqueletoPagina />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  const u = await exigirUsuario();
  return (
    <>
      <Cabecalho titulo="Minha senha" descricao={`${u.nome} · ${u.email}`} />
      <Cartao className="max-w-md p-6">
        <FormSenha />
      </Cartao>
    </>
  );
}
