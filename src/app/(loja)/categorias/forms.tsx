'use client';

import { useActionState, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Aviso, Botao } from '@/components/ui';
import { criarCategoria, excluirCategoria, renomearCategoria } from './actions';

const input = 'w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-500/20';

export function NovaCategoria() {
  const [estado, acao, salvando] = useActionState(criarCategoria, undefined);
  return (
    <form action={acao} className="space-y-3" key={estado?.mensagem}>
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      {estado?.mensagem && <Aviso tipo="ok">{estado.mensagem}</Aviso>}
      <div className="flex gap-2">
        <input name="nome" placeholder="Ex.: Bebidas" className={input} required maxLength={40} />
        <Botao disabled={salvando}><Plus size={16} /> Criar</Botao>
      </div>
    </form>
  );
}

export function LinhaCategoria({ id, nome, produtos, admin }: { id: string; nome: string; produtos: number; admin: boolean }) {
  const [editando, setEditando] = useState(false);
  const [estado, acao, salvando] = useActionState(async (s: Parameters<typeof renomearCategoria>[1], f: FormData) => {
    const r = await renomearCategoria(id, s, f);
    if (r?.ok) setEditando(false);
    return r;
  }, undefined);

  if (editando) {
    return (
      <form action={acao} className="flex items-center gap-2 px-5 py-2.5">
        <input name="nome" defaultValue={nome} className={input} autoFocus maxLength={40} />
        <button disabled={salvando} className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50" aria-label="Salvar"><Check size={16} /></button>
        <button type="button" onClick={() => setEditando(false)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100" aria-label="Cancelar"><X size={16} /></button>
        {estado?.erro && <span className="text-xs text-red-600">{estado.erro}</span>}
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between px-5 py-3 text-sm">
      <div>
        <p className="font-medium">{nome}</p>
        <p className="text-xs text-zinc-500">{produtos} produto{produtos === 1 ? '' : 's'}</p>
      </div>
      {admin && (
        <div className="flex gap-1">
          <button onClick={() => setEditando(true)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100" aria-label={`Renomear ${nome}`}><Pencil size={15} /></button>
          <form
            action={excluirCategoria.bind(null, id)}
            onSubmit={(e) => {
              if (!confirm(`Excluir "${nome}"? ${produtos ? `Os ${produtos} produtos ficam sem categoria.` : ''}`)) e.preventDefault();
            }}
          >
            <button className="rounded-lg p-2 text-zinc-500 hover:bg-red-50 hover:text-red-600" aria-label={`Excluir ${nome}`}><Trash2 size={15} /></button>
          </form>
        </div>
      )}
    </div>
  );
}
