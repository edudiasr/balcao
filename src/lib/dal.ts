import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { usuarioDaSessao } from './sessao';

// Toda página e toda ação do servidor passa por aqui antes de tocar nos dados.
// O proxy.ts só faz um filtro rápido pelo cookie; quem decide de verdade é este arquivo.

export const usuarioAtual = cache(usuarioDaSessao);

export async function exigirUsuario() {
  const u = await usuarioAtual();
  if (!u) redirect('/login');
  return u;
}

export async function exigirAdmin() {
  const u = await exigirUsuario();
  if (u.papel !== 'ADMIN') redirect('/painel?aviso=sem-permissao');
  return u;
}

export type UsuarioLogado = Awaited<ReturnType<typeof exigirUsuario>>;

/** Para ações do servidor: em vez de redirecionar, devolve erro para o formulário mostrar. */
export async function usuarioOuErro(papel?: 'ADMIN'): Promise<{ erro: string } | { usuario: UsuarioLogado }> {
  const u = await usuarioAtual();
  if (!u) return { erro: 'Sua sessão expirou. Entre de novo.' };
  if (papel === 'ADMIN' && u.papel !== 'ADMIN') return { erro: 'Só o administrador pode fazer isso.' };
  return { usuario: u };
}
