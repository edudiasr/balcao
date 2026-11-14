import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Paginacao({ pagina, total, porPagina, params }: { pagina: number; total: number; porPagina: number; params: Record<string, string> }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (paginas <= 1) return null;
  const link = (p: number) => {
    const sp = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
    sp.set('pagina', String(p));
    return `?${sp}`;
  };
  const classe = 'inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50';
  return (
    <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600">
      <span>
        Página {pagina} de {paginas}
      </span>
      <div className="flex gap-2">
        {pagina > 1 && <Link href={link(pagina - 1)} className={classe}><ChevronLeft size={14} /> Anterior</Link>}
        {pagina < paginas && <Link href={link(pagina + 1)} className={classe}>Próxima <ChevronRight size={14} /></Link>}
      </div>
    </div>
  );
}
