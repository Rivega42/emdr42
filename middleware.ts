import { NextResponse, type NextRequest } from 'next/server';

/**
 * Защита protected routes.
 *
 * Текущая реализация: проверяет cookie `auth-token`.
 * Клиент сейчас хранит токен в localStorage (не виден middleware) — полноценная
 * защита появится после перехода на HttpOnly cookies (см. #115).
 *
 * До того, layout.tsx продолжает проверять `useAuth()` клиентом как fallback.
 */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/patients',
  '/progress',
  '/settings',
  '/admin',
  '/emotion-test',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/patients/:path*',
    '/progress/:path*',
    '/settings/:path*',
    '/admin/:path*',
    '/emotion-test/:path*',
  ],
};
