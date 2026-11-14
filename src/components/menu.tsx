'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  BarChart3, Boxes, ClipboardList, LayoutDashboard, LogOut, Menu as IconeMenu, ScanBarcode, Store, UserCog, Users, Wallet, X, KeyRound, Tags,
} from 'lucide-react';
import { sair } from '@/app/login/actions';

const ITENS = [
  { href: '/painel', rotulo: 'Painel', icone: LayoutDashboard },
  { href: '/pdv', rotulo: 'Frente de caixa', icone: ScanBarcode },
  { href: '/vendas', rotulo: 'Vendas', icone: ClipboardList },
  { href: '/caixa', rotulo: 'Caixa', icone: Wallet },
  { href: '/produtos', rotulo: 'Produtos', icone: Boxes },
  { href: '/categorias', rotulo: 'Categorias', icone: Tags },
  { href: '/clientes', rotulo: 'Clientes', icone: Users },
  { href: '/relatorios', rotulo: 'Relatórios', icone: BarChart3, admin: true },
  { href: '/usuarios', rotulo: 'Usuários', icone: UserCog, admin: true },
];

export function Menu({ usuario }: { usuario: { nome: string; papel: 'ADMIN' | 'VENDEDOR' } }) {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  const itens = ITENS.filter((i) => !i.admin || usuario.papel === 'ADMIN');

  const conteudo = (
    <>
      <div className="flex h-16 items-center gap-2 px-5 text-lg font-semibold text-white">
        <Store size={22} className="text-marca-500" /> Balcão
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {itens.map(({ href, rotulo, icone: Icone }) => {
          const ativo = caminho === href || caminho.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setAberto(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                ativo ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100'
              }`}
            >
              <Icone size={18} className={ativo ? 'text-marca-500' : ''} />
              {rotulo}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-800 p-3">
        <div className="px-3 py-2">
          <p className="truncate text-sm font-medium text-zinc-100">{usuario.nome}</p>
          <p className="text-xs text-zinc-500">{usuario.papel === 'ADMIN' ? 'Administrador' : 'Vendedor'}</p>
        </div>
        <Link href="/conta" onClick={() => setAberto(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100">
          <KeyRound size={16} /> Minha senha
        </Link>
        <form action={sair}>
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100">
            <LogOut size={16} /> Sair
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-zinc-900 lg:flex print:!hidden">{conteudo}</aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 lg:hidden print:hidden">
        <button onClick={() => setAberto(true)} aria-label="Abrir menu" className="rounded-lg p-2 hover:bg-zinc-100">
          <IconeMenu size={20} />
        </button>
        <span className="flex items-center gap-2 font-semibold">
          <Store size={18} className="text-marca-600" /> Balcão
        </span>
        <span className="w-9" />
      </header>

      {aberto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-zinc-900/50" onClick={() => setAberto(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-zinc-900">
            <button onClick={() => setAberto(false)} aria-label="Fechar menu" className="absolute right-3 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800">
              <X size={18} />
            </button>
            {conteudo}
          </aside>
        </div>
      )}
    </>
  );
}
