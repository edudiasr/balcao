'use server';

import { refresh } from 'next/cache';
import { db } from '@/lib/db';
import { usuarioOuErro } from '@/lib/dal';
import { cancelarVenda } from '@/lib/servicos/vendas';
import { tentar } from '@/lib/servicos/base';
import { texto, type EstadoForm } from '@/lib/formulario';

export async function cancelar(vendaId: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  const quem = await usuarioOuErro('ADMIN');
  if ('erro' in quem) return { erro: quem.erro };
  const r = await tentar(() => cancelarVenda(db, { vendaId, usuarioId: quem.usuario.id, motivo: texto(f, 'motivo') }));
  if (!r.ok) return { erro: r.erro };
  refresh();
  return { ok: true, mensagem: 'Venda cancelada e itens devolvidos ao estoque.' };
}
