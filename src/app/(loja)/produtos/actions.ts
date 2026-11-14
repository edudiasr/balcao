'use server';

import { redirect } from 'next/navigation';
import { refresh } from 'next/cache';
import { db } from '@/lib/db';
import { usuarioOuErro } from '@/lib/dal';
import { paraCentavos } from '@/lib/dominio/dinheiro';
import { esquemaProduto, criarProduto, atualizarProduto, movimentarEstoque } from '@/lib/servicos/produtos';
import { tentar } from '@/lib/servicos/base';
import { errosDoZod, inteiro, texto, type EstadoForm } from '@/lib/formulario';

function lerProduto(f: FormData) {
  return esquemaProduto.safeParse({
    codigo: texto(f, 'codigo'),
    nome: texto(f, 'nome'),
    descricao: texto(f, 'descricao') || null,
    categoriaId: texto(f, 'categoriaId') || null,
    unidade: texto(f, 'unidade'),
    precoCusto: paraCentavos(texto(f, 'precoCusto')) ?? NaN,
    precoVenda: paraCentavos(texto(f, 'precoVenda')) ?? NaN,
    estoqueMinimo: inteiro(f, 'estoqueMinimo'),
    ativo: f.get('ativo') === 'on',
  });
}

export async function salvarProduto(id: string | null, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  const quem = await usuarioOuErro('ADMIN');
  if ('erro' in quem) return { erro: quem.erro };
  const dados = lerProduto(f);
  if (!dados.success) return errosDoZod(dados.error);

  if (id) {
    const r = await tentar(() => atualizarProduto(db, id, dados.data));
    if (!r.ok) return { erro: r.erro };
    refresh();
    return { ok: true, mensagem: 'Produto atualizado.' };
  }

  const estoqueInicial = inteiro(f, 'estoqueInicial') || 0;
  const r = await tentar(() => db.$transaction((tx) => criarProduto(tx, dados.data, estoqueInicial, quem.usuario.id)));
  if (!r.ok) return { erro: r.erro };
  redirect(`/produtos/${r.dados!.id}?criado=1`);
}

export async function registrarMovimento(produtoId: string, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  const tipo = texto(f, 'tipo') as 'ENTRADA' | 'SAIDA' | 'AJUSTE';
  if (!['ENTRADA', 'SAIDA', 'AJUSTE'].includes(tipo)) return { erro: 'Escolha o tipo de movimento.' };
  // vendedor pode dar entrada de mercadoria; saída e ajuste de inventário só o administrador
  const quem = await usuarioOuErro(tipo === 'ENTRADA' ? undefined : 'ADMIN');
  if ('erro' in quem) return { erro: quem.erro };

  const quantidade = inteiro(f, 'quantidade');
  const motivo = texto(f, 'motivo');
  if (tipo !== 'ENTRADA' && motivo.length < 3) return { erro: 'Diga o motivo (ex.: avaria, vencido, contagem).', campos: { motivo: ['Obrigatório'] } };

  const r = await tentar(() => movimentarEstoque(db, { produtoId, tipo, quantidade, motivo, usuarioId: quem.usuario.id }));
  if (!r.ok) return { erro: r.erro };
  refresh();
  return { ok: true, mensagem: 'Estoque atualizado.' };
}
