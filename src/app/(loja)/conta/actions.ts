'use server';

import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { usuarioOuErro } from '@/lib/dal';
import { alterarSenha, senhaValida } from '@/lib/servicos/usuarios';
import { tentar } from '@/lib/servicos/base';
import { encerrarSessao } from '@/lib/sessao';
import { texto, type EstadoForm } from '@/lib/formulario';

export async function trocarSenha(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  const quem = await usuarioOuErro();
  if ('erro' in quem) return { erro: quem.erro };
  const nova = senhaValida.safeParse(texto(f, 'nova'));
  if (!nova.success) return { erro: nova.error.issues[0].message };
  if (texto(f, 'nova') !== texto(f, 'repetir')) return { erro: 'As duas senhas novas não são iguais.' };
  const r = await tentar(() => alterarSenha(db, quem.usuario.id, texto(f, 'atual'), nova.data));
  if (!r.ok) return { erro: r.erro };
  await encerrarSessao();
  redirect('/login');
}
