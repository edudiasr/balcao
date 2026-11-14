'use server';

import { refresh } from 'next/cache';
import { db } from '@/lib/db';
import { usuarioOuErro } from '@/lib/dal';
import { paraCentavos } from '@/lib/dominio/dinheiro';
import { abrirCaixa, fecharCaixa, movimentarCaixa } from '@/lib/servicos/caixa';
import { tentar } from '@/lib/servicos/base';
import { texto, type EstadoForm } from '@/lib/formulario';

export async function abrir(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  const quem = await usuarioOuErro();
  if ('erro' in quem) return { erro: quem.erro };
  const valor = paraCentavos(texto(f, 'valor') || '0');
  if (valor == null) return { erro: 'Valor inválido.' };
  const r = await tentar(() => abrirCaixa(db, quem.usuario.id, valor));
  if (!r.ok) return { erro: r.erro };
  refresh();
  return { ok: true };
}

export async function movimentar(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  const quem = await usuarioOuErro();
  if ('erro' in quem) return { erro: quem.erro };
  const tipo = texto(f, 'tipo') === 'SUPRIMENTO' ? 'SUPRIMENTO' : 'SANGRIA';
  const valor = paraCentavos(texto(f, 'valor'));
  if (valor == null) return { erro: 'Valor inválido.' };
  const r = await tentar(() => movimentarCaixa(db, { tipo, valor, motivo: texto(f, 'motivo'), usuarioId: quem.usuario.id }));
  if (!r.ok) return { erro: r.erro };
  refresh();
  return { ok: true, mensagem: tipo === 'SANGRIA' ? 'Sangria registrada.' : 'Suprimento registrado.' };
}

export async function fechar(_: EstadoForm, f: FormData): Promise<EstadoForm> {
  const quem = await usuarioOuErro();
  if ('erro' in quem) return { erro: quem.erro };
  const contado = paraCentavos(texto(f, 'contado'));
  if (contado == null) return { erro: 'Informe quanto tem na gaveta.' };
  const r = await tentar(() => fecharCaixa(db, { usuarioId: quem.usuario.id, valorContado: contado, observacao: texto(f, 'observacao') }));
  if (!r.ok) return { erro: r.erro };
  refresh();
  return { ok: true, mensagem: 'Caixa fechado.' };
}
