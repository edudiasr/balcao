// Componentes básicos reaproveitados nas telas. Nada de biblioteca de UI: Tailwind puro.

import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type Variante = 'primario' | 'secundario' | 'perigo' | 'fantasma';

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-marca-600 text-white hover:bg-marca-700 shadow-sm',
  secundario: 'bg-white text-zinc-800 border border-zinc-300 hover:bg-zinc-50 shadow-sm',
  perigo: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  fantasma: 'text-zinc-600 hover:bg-zinc-100',
};

const BASE_BOTAO =
  'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600';

export function Botao({ variante = 'primario', className, ...props }: ComponentProps<'button'> & { variante?: Variante }) {
  return <button className={cx(BASE_BOTAO, VARIANTES[variante], className)} {...props} />;
}

export function LinkBotao({ variante = 'primario', className, ...props }: ComponentProps<typeof Link> & { variante?: Variante }) {
  return <Link className={cx(BASE_BOTAO, VARIANTES[variante], className)} {...props} />;
}

export function Cartao({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cx('rounded-xl border border-zinc-200 bg-white shadow-sm', className)} {...props} />;
}

export function Cabecalho({ titulo, descricao, acoes }: { titulo: string; descricao?: string; acoes?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-zinc-500">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

const CAMPO = 'block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-500/20 disabled:bg-zinc-50';

export function Campo({
  rotulo,
  erro,
  ajuda,
  className,
  ...props
}: ComponentProps<'input'> & { rotulo: string; erro?: string[] | string; ajuda?: string }) {
  const msg = Array.isArray(erro) ? erro[0] : erro;
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 block text-sm font-medium text-zinc-700">{rotulo}</span>
      <input className={cx(CAMPO, msg && 'border-red-400 focus:border-red-500 focus:ring-red-500/20')} aria-invalid={!!msg} {...props} />
      {msg ? <span className="mt-1 block text-xs text-red-600">{msg}</span> : ajuda && <span className="mt-1 block text-xs text-zinc-500">{ajuda}</span>}
    </label>
  );
}

export function Selecao({
  rotulo,
  erro,
  className,
  children,
  ...props
}: ComponentProps<'select'> & { rotulo: string; erro?: string[] | string }) {
  const msg = Array.isArray(erro) ? erro[0] : erro;
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 block text-sm font-medium text-zinc-700">{rotulo}</span>
      <select className={cx(CAMPO, 'pr-8')} {...props}>
        {children}
      </select>
      {msg && <span className="mt-1 block text-xs text-red-600">{msg}</span>}
    </label>
  );
}

export function AreaTexto({ rotulo, className, ...props }: ComponentProps<'textarea'> & { rotulo: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 block text-sm font-medium text-zinc-700">{rotulo}</span>
      <textarea className={CAMPO} rows={3} {...props} />
    </label>
  );
}

type Cor = 'verde' | 'amarelo' | 'vermelho' | 'cinza' | 'azul';
const CORES: Record<Cor, string> = {
  verde: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amarelo: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  vermelho: 'bg-red-50 text-red-700 ring-red-600/20',
  cinza: 'bg-zinc-100 text-zinc-600 ring-zinc-500/20',
  azul: 'bg-sky-50 text-sky-700 ring-sky-600/20',
};

export function Etiqueta({ cor = 'cinza', children }: { cor?: Cor; children: ReactNode }) {
  return <span className={cx('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', CORES[cor])}>{children}</span>;
}

export function Aviso({ tipo = 'erro', children }: { tipo?: 'erro' | 'ok' | 'info'; children: ReactNode }) {
  const estilo = {
    erro: 'border-red-200 bg-red-50 text-red-800',
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800',
  }[tipo];
  return (
    <div role={tipo === 'erro' ? 'alert' : 'status'} className={cx('rounded-lg border px-3 py-2 text-sm', estilo)}>
      {children}
    </div>
  );
}

export function Tabela({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('overflow-x-auto', className)}>
      <table className="min-w-full divide-y divide-zinc-200 text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cx('whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500', className)}>{children}</th>;
}

export function Td({ children, className, ...props }: ComponentProps<'td'>) {
  return (
    <td className={cx('whitespace-nowrap px-4 py-3 text-zinc-700', className)} {...props}>
      {children}
    </td>
  );
}

export function Vazio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="font-medium text-zinc-700">{titulo}</p>
      {children && <div className="mt-1 text-sm text-zinc-500">{children}</div>}
    </div>
  );
}

export function Indicador({ titulo, valor, detalhe, icone }: { titulo: string; valor: ReactNode; detalhe?: ReactNode; icone?: ReactNode }) {
  return (
    <Cartao className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-zinc-500">{titulo}</p>
        {icone && <span className="text-zinc-400">{icone}</span>}
      </div>
      <p className="num mt-2 text-2xl font-semibold tracking-tight text-zinc-900">{valor}</p>
      {detalhe && <p className="mt-1 text-xs text-zinc-500">{detalhe}</p>}
    </Cartao>
  );
}

export { cx };
