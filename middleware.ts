import { NextResponse, type NextRequest } from 'next/server';

/**
 * Защита protected routes.
 *
 * #115 Stage A: backend выдаёт HttpOnly `access_token` cookie при
 * login/register/refresh — middleware теперь реально работает.
 * layout.tsx продолжает проверять `useAuth()` клиентом (защита данных,
 * middleware — защита от flash-of-content).
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

  const token = request.cookies.get('access_token')?.value;

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
