import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC = ['/login'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    // Já logado → manda pro dashboard
    if (req.cookies.get('shoppe_token')?.value) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  const token = req.cookies.get('shoppe_token')?.value;
  if (!token) {
    const login = new URL('/login', req.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Protege páginas do dashboard. Libera assets, proxy /backend e APIs internas.
     */
    '/((?!_next/static|_next/image|favicon.ico|backend).*)',
  ],
};
