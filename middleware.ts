import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/jwt';

/**
 * Roda no runtime Edge, onde bcryptjs e o Prisma Client não funcionam. Por isso
 * aqui só se verifica a assinatura do JWT — qualquer coisa que precise do banco
 * fica nos Route Handlers, via requireSession().
 */

/** Rotas de API que não exigem sessão: são a porta de entrada de quem ainda não tem uma. */
const PUBLIC_API = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

/**
 * Webhooks são chamados por Evolution API, Stripe e Asaas, que não têm cookie.
 * Continuam autenticados pelo mecanismo do próprio emissor (assinatura ou token).
 */
const WEBHOOK_PREFIXES = ['/api/webhook', '/api/webhooks'];

function clearSession(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (WEBHOOK_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }
  if (PUBLIC_API.includes(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  const isApi = pathname.startsWith('/api/');
  const isLoginPage = pathname === '/login';

  if (!session) {
    if (isApi) {
      return NextResponse.json(
        { ok: false, error: 'Sessão inválida ou expirada.' },
        { status: 401 }
      );
    }

    if (isLoginPage) {
      // Cookie presente mas inválido: limpa para não deixar o usuário preso num laço.
      return token ? clearSession(NextResponse.next()) : NextResponse.next();
    }

    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') loginUrl.searchParams.set('callbackUrl', pathname);
    const redirect = NextResponse.redirect(loginUrl);
    return token ? clearSession(redirect) : redirect;
  }

  if (isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Diferente da versão anterior, `api/` NÃO é excluído: as rotas de dados
  // passam pelo middleware. Arquivos estáticos e assets seguem de fora.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)'],
};
