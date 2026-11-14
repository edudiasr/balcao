'use server';

import { db } from '@/lib/db';
import { usuarioOuErro } from '@/lib/dal';
import { esquemaVenda, finalizarVenda } from '@/lib/servicos/vendas';
import { tentar } from '@/lib/servicos/base';

export type RespostaVenda = { ok: true; id: string; numero: number; troco: number } | { ok: false; erro: string };

export async function fecharVenda(pedido: unknown): Promise<RespostaVenda> {
  const quem = await usuarioOuErro();
  if ('erro' in quem) return { ok: false, erro: quem.erro };
  const dados = esquemaVenda.safeParse(pedido);
  if (!dados.success) return { ok: false, erro: dados.error.issues[0].message };
  const r = await tentar(() => finalizarVenda(db, { id: quem.usuario.id, papel: quem.usuario.papel }, dados.data));
  if (!r.ok) return r;
  return { ok: true, id: r.dados.id, numero: r.dados.numero, troco: r.dados.troco };
}
