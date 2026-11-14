import type { Prisma, PrismaClient } from '@/generated/prisma/client';

/** Cliente do banco ou uma transação aberta: os serviços funcionam com os dois. */
export type Banco = PrismaClient | Prisma.TransactionClient;

/** Erro de regra de negócio, com mensagem que pode ir direto para a tela. */
export class ErroNegocio extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroNegocio';
  }
}

/** Prisma: registro não encontrado no update/delete. */
export const naoEncontrado = (e: unknown) => (e as { code?: string })?.code === 'P2025';
/** Prisma: violou índice único. */
export const duplicado = (e: unknown) => (e as { code?: string })?.code === 'P2002';

export type Resultado<T = undefined> = { ok: true; dados: T } | { ok: false; erro: string };

/** Executa e transforma ErroNegocio em { ok: false, erro } (o resto continua estourando). */
export async function tentar<T>(fn: () => Promise<T>): Promise<Resultado<T>> {
  try {
    return { ok: true, dados: await fn() };
  } catch (e) {
    if (e instanceof ErroNegocio) return { ok: false, erro: e.message };
    throw e;
  }
}
