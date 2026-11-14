// Formato de resposta das ações de formulário (usado com useActionState).

import type { ZodError } from 'zod';

export type EstadoForm =
  | {
      ok?: boolean;
      mensagem?: string;
      erro?: string;
      campos?: Record<string, string[]>;
    }
  | undefined;

export function errosDoZod(e: ZodError): EstadoForm {
  const campos: Record<string, string[]> = {};
  for (const issue of e.issues) {
    const chave = String(issue.path[0] ?? 'geral');
    (campos[chave] ??= []).push(issue.message);
  }
  return { erro: 'Confira os campos destacados.', campos };
}

export const texto = (f: FormData, nome: string) => {
  const v = f.get(nome);
  return typeof v === 'string' ? v.trim() : '';
};

export const inteiro = (f: FormData, nome: string) => {
  const t = texto(f, nome);
  return /^-?\d+$/.test(t) ? Number(t) : NaN;
};
