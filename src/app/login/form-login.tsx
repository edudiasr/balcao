'use client';

import { useActionState } from 'react';
import { LogIn } from 'lucide-react';
import { Aviso, Botao, Campo } from '@/components/ui';
import { entrar } from './actions';

export function FormLogin({ voltar }: { voltar?: string }) {
  const [estado, acao, enviando] = useActionState(entrar, undefined);
  return (
    <form action={acao} className="space-y-4">
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      <Campo rotulo="E-mail" name="email" type="email" autoComplete="username" defaultValue={estado?.email} required autoFocus />
      <Campo rotulo="Senha" name="senha" type="password" autoComplete="current-password" required />
      {voltar && <input type="hidden" name="voltar" value={voltar} />}
      <Botao className="w-full py-2.5" disabled={enviando}>
        <LogIn size={16} />
        {enviando ? 'Entrando...' : 'Entrar'}
      </Botao>
    </form>
  );
}
