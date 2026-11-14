'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/lib/db';
import { autenticar } from '@/lib/servicos/usuarios';
import { criarSessao, encerrarSessao } from '@/lib/sessao';

export type EstadoLogin = { erro?: string; email?: string } | undefined;

// Limite simples de tentativas por e-mail + IP (memória do processo).
// Num deploy com várias instâncias isso iria para o Redis; para uma loja, um servidor só basta.
const tentativas = new Map<string, number[]>();
const JANELA = 10 * 60 * 1000;
const MAXIMO = 5;

function bloqueado(chave: string) {
  const agora = Date.now();
  const lista = (tentativas.get(chave) ?? []).filter((t) => agora - t < JANELA);
  tentativas.set(chave, lista);
  return lista.length >= MAXIMO;
}

const esquema = z.object({
  email: z.email('Digite um e-mail válido.').trim().toLowerCase(),
  senha: z.string().min(1, 'Digite a senha.'),
  voltar: z.string().optional(),
});

export async function entrar(_: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const dados = esquema.safeParse(Object.fromEntries(form));
  if (!dados.success) return { erro: dados.error.issues[0].message, email: String(form.get('email') ?? '') };
  const { email, senha, voltar } = dados.data;

  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const chave = `${email}|${ip}`;
  if (bloqueado(chave)) return { erro: 'Muitas tentativas. Espere alguns minutos e tente de novo.', email };

  const usuario = await autenticar(db, email, senha);
  if (!usuario) {
    tentativas.get(chave)!.push(Date.now());
    return { erro: 'E-mail ou senha incorretos.', email };
  }
  tentativas.delete(chave);
  await criarSessao(usuario.id);
  // só aceita voltar para caminho interno (evita redirecionar para site de fora)
  redirect(voltar?.startsWith('/') && !voltar.startsWith('//') ? voltar : '/painel');
}

export async function sair() {
  await encerrarSessao();
  redirect('/login');
}
