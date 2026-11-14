import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from './db';

export const COOKIE_SESSAO = 'balcao_sessao';
const DURACAO_MS = 12 * 60 * 60 * 1000; // um turno longo de loja

/** No banco fica só o hash do token: se o banco vazar, ninguém consegue usar as sessões. */
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function criarSessao(usuarioId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiraEm = new Date(Date.now() + DURACAO_MS);
  await db.sessao.create({ data: { id: hashToken(token), usuarioId, expiraEm } });
  const jar = await cookies();
  jar.set(COOKIE_SESSAO, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiraEm,
  });
}

export async function encerrarSessao() {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESSAO)?.value;
  if (token) await db.sessao.deleteMany({ where: { id: hashToken(token) } });
  jar.delete(COOKIE_SESSAO);
}

/** Usuário dono do cookie atual, ou null (sessão vencida, usuário desativado...). */
export async function usuarioDaSessao() {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token) return null;
  const sessao = await db.sessao.findUnique({
    where: { id: hashToken(token) },
    include: { usuario: { select: { id: true, nome: true, email: true, papel: true, ativo: true } } },
  });
  if (!sessao || sessao.expiraEm < new Date() || !sessao.usuario.ativo) return null;
  return sessao.usuario;
}
