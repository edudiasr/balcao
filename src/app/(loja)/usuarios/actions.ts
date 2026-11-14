'use server';

import { refresh } from 'next/cache';
import { db } from '@/lib/db';
import { usuarioOuErro } from '@/lib/dal';
import { alternarAtivo, criarUsuario, esquemaUsuario, redefinirSenha, senhaValida } from '@/lib/servicos/usuarios';
import { tentar } from '@/lib/servicos/base';
import { errosDoZod, texto, type EstadoForm } from '@/lib/formulario';

export async function novoUsuario(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  const quem = await usuarioOuErro('ADMIN');
  if ('erro' in quem) return { erro: quem.erro };
  const dados = esquemaUsuario.safeParse({ nome: texto(f, 'nome'), email: texto(f, 'email'), papel: texto(f, 'papel'), senha: texto(f, 'senha') });
  if (!dados.success) return errosDoZod(dados.error);
  const r = await tentar(() => criarUsuario(db, dados.data));
  if (!r.ok) return { erro: r.erro };
  refresh();
  return { ok: true, mensagem: `${dados.data.nome.split(' ')[0]} já pode entrar com ${dados.data.email}.` };
}

export async function ativarDesativar(id: string) {
  const quem = await usuarioOuErro('ADMIN');
  if ('erro' in quem) return { erro: quem.erro };
  const r = await tentar(() => alternarAtivo(db, id, quem.usuario.id));
  refresh();
  return r.ok ? { ok: true } : { erro: r.erro };
}

export async function novaSenha(id: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  const quem = await usuarioOuErro('ADMIN');
  if ('erro' in quem) return { erro: quem.erro };
  const senha = senhaValida.safeParse(texto(f, 'senha'));
  if (!senha.success) return { erro: senha.error.issues[0].message };
  await redefinirSenha(db, id, senha.data);
  return { ok: true, mensagem: 'Senha trocada. A pessoa precisa entrar de novo.' };
}
