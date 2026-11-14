'use client';

import { useActionState } from 'react';
import { Aviso, Botao, Campo } from '@/components/ui';
import { trocarSenha } from './actions';

export function FormSenha() {
  const [estado, acao, salvando] = useActionState(trocarSenha, undefined);
  return (
    <form action={acao} className="space-y-4">
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      <Campo rotulo="Senha atual" name="atual" type="password" autoComplete="current-password" required />
      <Campo rotulo="Nova senha" name="nova" type="password" autoComplete="new-password" required ajuda="Mínimo 8 caracteres, com letra e número." />
      <Campo rotulo="Repita a nova senha" name="repetir" type="password" autoComplete="new-password" required />
      <Botao disabled={salvando}>{salvando ? 'Salvando...' : 'Trocar senha'}</Botao>
      <p className="text-xs text-zinc-500">Ao trocar, você sai de todos os aparelhos e entra de novo com a senha nova.</p>
    </form>
  );
}
