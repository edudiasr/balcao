import type { Metadata } from 'next';
import { Suspense } from 'react';
import { db } from '@/lib/db';
import { exigirAdmin } from '@/lib/dal';
import { Cabecalho, Cartao, Etiqueta, Tabela, Td, Th } from '@/components/ui';
import { EsqueletoPagina } from '@/components/esqueleto';
import { AcoesUsuario, FormNovoUsuario } from './forms';

export const metadata: Metadata = { title: 'Usuários' };

export default function Usuarios() {
  return (
    <Suspense fallback={<EsqueletoPagina />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  const eu = await exigirAdmin();
  const usuarios = await db.usuario.findMany({
    orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
    select: { id: true, nome: true, email: true, papel: true, ativo: true, criadoEm: true, _count: { select: { vendas: true } } },
  });
  return (
    <>
      <Cabecalho titulo="Usuários" descricao="Quem pode entrar no sistema e o que pode fazer." />
      <div className="grid gap-6 xl:grid-cols-3">
        <Cartao className="xl:col-span-2">
          <Tabela>
            <thead className="bg-zinc-50">
              <tr><Th>Usuário</Th><Th>Papel</Th><Th className="text-right">Vendas</Th><Th className="text-right">Ações</Th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {usuarios.map((u) => (
                <tr key={u.id} className={u.ativo ? '' : 'opacity-60'}>
                  <Td>
                    <p className="font-medium text-zinc-900">{u.nome} {u.id === eu.id && <span className="text-xs font-normal text-zinc-400">(você)</span>}</p>
                    <p className="text-xs text-zinc-500">{u.email}</p>
                  </Td>
                  <Td>
                    <Etiqueta cor={u.papel === 'ADMIN' ? 'azul' : 'cinza'}>{u.papel === 'ADMIN' ? 'Administrador' : 'Vendedor'}</Etiqueta>{' '}
                    {!u.ativo && <Etiqueta cor="vermelho">Desativado</Etiqueta>}
                  </Td>
                  <Td className="num text-right">{u._count.vendas}</Td>
                  <Td className="text-right"><AcoesUsuario id={u.id} ativo={u.ativo} eu={u.id === eu.id} /></Td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        </Cartao>
        <Cartao className="h-fit p-5">
          <h2 className="mb-3 font-semibold">Novo usuário</h2>
          <FormNovoUsuario />
        </Cartao>
      </div>
    </>
  );
}
