'use server';

import { redirect } from 'next/navigation';
import { refresh } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { usuarioOuErro } from '@/lib/dal';
import { cnpjValido, cpfValido, soDigitos } from '@/lib/dominio/documento';
import { duplicado } from '@/lib/servicos/base';
import { errosDoZod, texto, type EstadoForm } from '@/lib/formulario';

const esquema = z.object({
  nome: z.string().trim().min(3, 'Digite o nome do cliente.').max(100),
  telefone: z
    .string()
    .transform(soDigitos)
    .refine((t) => !t || t.length === 10 || t.length === 11, 'Telefone com DDD (10 ou 11 números).'),
  documento: z
    .string()
    .transform(soDigitos)
    .refine((d) => !d || (d.length === 11 ? cpfValido(d) : d.length === 14 && cnpjValido(d)), 'CPF ou CNPJ inválido.'),
  email: z.union([z.literal(''), z.email('E-mail inválido.')]),
});

export async function salvarCliente(id: string | null, _: EstadoForm, f: FormData): Promise<EstadoForm> {
  const quem = await usuarioOuErro();
  if ('erro' in quem) return { erro: quem.erro };
  const r = esquema.safeParse({ nome: texto(f, 'nome'), telefone: texto(f, 'telefone'), documento: texto(f, 'documento'), email: texto(f, 'email') });
  if (!r.success) return errosDoZod(r.error);
  const dados = { nome: r.data.nome, telefone: r.data.telefone || null, documento: r.data.documento || null, email: r.data.email || null };
  try {
    if (id) {
      await db.cliente.update({ where: { id }, data: dados });
      refresh();
      return { ok: true, mensagem: 'Cliente atualizado.' };
    }
    const c = await db.cliente.create({ data: dados });
    redirect(`/clientes/${c.id}`);
  } catch (e) {
    if (duplicado(e)) return { erro: 'Já existe um cliente com esse CPF/CNPJ.', campos: { documento: ['Já cadastrado'] } };
    throw e;
  }
}
