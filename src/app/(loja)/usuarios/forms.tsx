'use client';

import { useActionState, useState, useTransition } from 'react';
import { KeyRound, UserPlus } from 'lucide-react';
import { Aviso, Botao, Campo, Selecao } from '@/components/ui';
import { ativarDesativar, novaSenha, novoUsuario } from './actions';

export function FormNovoUsuario() {
  const [estado, acao, salvando] = useActionState(novoUsuario, undefined);
  const e = estado?.campos ?? {};
  return (
    <form action={acao} className="space-y-3" key={estado?.mensagem}>
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      {estado?.mensagem && <Aviso tipo="ok">{estado.mensagem}</Aviso>}
      <Campo rotulo="Nome" name="nome" erro={e.nome} required />
      <Campo rotulo="E-mail" name="email" type="email" erro={e.email} required />
      <Selecao rotulo="Papel" name="papel" defaultValue="VENDEDOR">
        <option value="VENDEDOR">Vendedor (vende, dá entrada no estoque)</option>
        <option value="ADMIN">Administrador (tudo)</option>
      </Selecao>
      <Campo rotulo="Senha inicial" name="senha" type="password" autoComplete="new-password" erro={e.senha} required ajuda="Mínimo 8 caracteres, com letra e número." />
      <Botao className="w-full" disabled={salvando}><UserPlus size={16} /> Criar usuário</Botao>
    </form>
  );
}

export function AcoesUsuario({ id, ativo, eu }: { id: string; ativo: boolean; eu: boolean }) {
  const [trocando, setTrocando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const [estado, acao, salvando] = useActionState(novaSenha.bind(null, id), undefined);

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button onClick={() => setTrocando((v) => !v)} className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-medium hover:bg-zinc-50">
          <KeyRound size={13} /> Senha
        </button>
        {!eu && (
          <button
            disabled={pendente}
            onClick={() =>
              iniciar(async () => {
                const r = await ativarDesativar(id);
                setErro(r && 'erro' in r ? (r.erro ?? null) : null);
              })
            }
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${ativo ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}
          >
            {ativo ? 'Desativar' : 'Reativar'}
          </button>
        )}
      </div>
      {erro && <span className="text-xs text-red-600">{erro}</span>}
      {trocando && (
        <form action={acao} className="flex items-center gap-2">
          <input name="senha" type="password" placeholder="Nova senha" autoComplete="new-password" className="w-36 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs" />
          <button disabled={salvando} className="rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white">Salvar</button>
        </form>
      )}
      {estado?.erro && <span className="text-xs text-red-600">{estado.erro}</span>}
      {estado?.mensagem && <span className="text-xs text-emerald-700">{estado.mensagem}</span>}
    </div>
  );
}
