'use server';

import { refresh } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { usuarioOuErro } from '@/lib/dal';
import { duplicado } from '@/lib/servicos/base';
import { texto, type EstadoForm } from '@/lib/formulario';

const nome = z.string().trim().min(2, 'Nome muito curto.').max(40, 'Nome muito longo.');

export async function criarCategoria(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  const quem = await usuarioOuErro('ADMIN');
  if ('erro' in quem) return { erro: quem.erro };
  const r = nome.safeParse(texto(f, 'nome'));
  if (!r.success) return { erro: r.error.issues[0].message };
  try {
    await db.categoria.create({ data: { nome: r.data } });
  } catch (e) {
    if (duplicado(e)) return { erro: 'Essa categoria já existe.' };
    throw e;
  }
  refresh();
  return { ok: true, mensagem: `Categoria "${r.data}" criada.` };
}

export async function renomearCategoria(id: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  const quem = await usuarioOuErro('ADMIN');
  if ('erro' in quem) return { erro: quem.erro };
  const r = nome.safeParse(texto(f, 'nome'));
  if (!r.success) return { erro: r.error.issues[0].message };
  try {
    await db.categoria.update({ where: { id }, data: { nome: r.data } });
  } catch (e) {
    if (duplicado(e)) return { erro: 'Já existe uma categoria com esse nome.' };
    throw e;
  }
  refresh();
  return { ok: true };
}

export async function excluirCategoria(id: string) {
  const quem = await usuarioOuErro('ADMIN');
  if ('erro' in quem) return;
  // os produtos ficam "sem categoria" (onDelete: SetNull no schema)
  await db.categoria.delete({ where: { id } });
  refresh();
}
