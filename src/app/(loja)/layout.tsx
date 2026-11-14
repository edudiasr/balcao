import { Suspense } from 'react';
import { exigirUsuario } from '@/lib/dal';
import { Menu } from '@/components/menu';
import { EsqueletoPagina } from '@/components/esqueleto';

// Com Cache Components ligado, tudo que lê cookie ou banco precisa ficar dentro de um <Suspense>:
// o Next manda a "casca" da página na hora e o conteúdo chega em seguida.
// Toda tela aqui é por usuário e com dado fresco do banco, então a navegação pode esperar a sessão.
export const instant = false;

export default function LayoutLoja({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<CascaCarregando />}>
      <ComUsuario>{children}</ComUsuario>
    </Suspense>
  );
}

async function ComUsuario({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();
  return (
    <div className="min-h-screen">
      <Menu usuario={{ nome: usuario.nome, papel: usuario.papel }} />
      <main className="lg:pl-60 print:pl-0">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}

function CascaCarregando() {
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-60 bg-zinc-900 lg:block" />
      <main className="lg:pl-60">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <EsqueletoPagina />
        </div>
      </main>
    </div>
  );
}
