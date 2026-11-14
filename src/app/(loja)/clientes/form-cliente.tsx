'use client';

import { useActionState } from 'react';
import { Save } from 'lucide-react';
import { Aviso, Botao, Campo } from '@/components/ui';
import { formatarDocumento, formatarTelefone } from '@/lib/dominio/documento';
import { salvarCliente } from './actions';

type Cliente = { id: string; nome: string; telefone: string | null; documento: string | null; email: string | null };

export function FormCliente({ cliente }: { cliente?: Cliente }) {
  const [estado, acao, salvando] = useActionState(salvarCliente.bind(null, cliente?.id ?? null), undefined);
  const e = estado?.campos ?? {};
  return (
    <form action={acao} className="space-y-4">
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      {estado?.mensagem && <Aviso tipo="ok">{estado.mensagem}</Aviso>}
      <Campo rotulo="Nome" name="nome" defaultValue={cliente?.nome} erro={e.nome} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Telefone / WhatsApp" name="telefone" inputMode="tel" placeholder="(47) 99999-0000" defaultValue={formatarTelefone(cliente?.telefone)} erro={e.telefone} />
        <Campo rotulo="CPF ou CNPJ (opcional)" name="documento" inputMode="numeric" defaultValue={formatarDocumento(cliente?.documento)} erro={e.documento} />
      </div>
      <Campo rotulo="E-mail (opcional)" name="email" type="email" defaultValue={cliente?.email ?? ''} erro={e.email} />
      <Botao disabled={salvando}><Save size={16} /> {salvando ? 'Salvando...' : cliente ? 'Salvar' : 'Cadastrar cliente'}</Botao>
    </form>
  );
}
