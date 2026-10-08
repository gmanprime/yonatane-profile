import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ============================================================
  // 1. STEALTH ROUTING: /p/[hash] & /p/[hash]/blog/*
  // ============================================================
  if (pathname.startsWith('/p/')) {
    const segments = pathname.split('/').filter(Boolean);
    const hash = segments[1]; // ['p', 'hash', ...]

    // If accessing portfolio/blog route under hash: /p/[hash]/blog or /p/[hash]/blog/[id]
    if (segments.length >= 3 && segments[2] === 'blog') {
      const response = NextResponse.next();
      if (hash && hash !== 'default') {
        response.cookies.set('__profile', hash, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 31536000,
          path: '/',
        });
      }
      return response;
    }

    const targetUrl = new URL('/', request.url);
    const response = NextResponse.redirect(targetUrl, 302);

    if (!hash || hash === 'default') {
      // Clear stealth profile cookie and redirect to root default profile
      response.cookies.set('__profile', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      });
    } else {
      // Set persistent 1-year stealth profile cookie
      response.cookies.set('__profile', hash, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 31536000, // 1 year
        path: '/',
      });
    }

    return response;
  }

  // Refresh Supabase session and get authenticated user
  const { supabaseResponse, user } = await updateSession(request);

  // ============================================================
  // 2. ADMIN PORTAL ROUTE GUARDS: /admin/*
  // ============================================================
  if (pathname.startsWith('/admin')) {
    const isAuthPage =
      pathname === '/admin/login' ||
      pathname === '/admin/register' ||
      pathname === '/admin/forgot-password';

    if (!user && !isAuthPage) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      const redirectResponse = NextResponse.redirect(loginUrl, 302);
      // Forward any refreshed session cookies on redirect
      supabaseResponse.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value);
      });
      return redirectResponse;
    }

    if (user && isAuthPage) {
      const dashboardUrl = new URL('/admin', request.url);
      const redirectResponse = NextResponse.redirect(dashboardUrl, 302);
      supabaseResponse.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value);
      });
      return redirectResponse;
    }

    return supabaseResponse;
  }

  // ============================================================
  // 3. API ROUTE GUARDS: /api/v1/*
  // ============================================================
  if (pathname.startsWith('/api/v1/')) {
    // Public API route whitelist
    const isPublicApi =
      pathname.startsWith('/api/v1/public/') ||
      pathname === '/api/v1/auth/login' ||
      pathname.startsWith('/api/v1/auth/passkey/authenticate') ||
      pathname === '/api/v1/auth/invite/validate' ||
      pathname === '/api/v1/auth/invite/register' ||
      pathname === '/api/v1/auth/totp/login' ||
      pathname === '/api/v1/auth/password/recover';

    if (!isPublicApi && !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, icons, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
