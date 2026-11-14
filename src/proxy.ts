import { NextResponse, type NextRequest } from 'next/server';

// Filtro rápido: sem cookie de sessão, nem chega a renderizar a página, vai pro login.
// A checagem de verdade (sessão válida no banco, papel do usuário) fica em src/lib/dal.ts.

const PUBLICAS = ['/login'];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const temSessao = req.cookies.has('balcao_sessao');
  const publica = PUBLICAS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!temSessao && !publica) {
    const url = new URL('/login', req.nextUrl);
    if (pathname !== '/') url.searchParams.set('voltar', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico)$).*)'],
};
