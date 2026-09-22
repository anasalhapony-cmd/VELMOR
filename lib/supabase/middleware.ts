import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';

/**
 * Build a per-request nonce-based Content-Security-Policy. The nonce is exposed
 * on the `x-nonce` request header so Next.js nonces its own scripts, and the CSP
 * is set on both the request (so the framework reads it) and the response.
 *
 * Notes:
 *  - style-src allows 'unsafe-inline' because Tailwind/Framer Motion inject
 *    inline styles; script nonces are the important protection against XSS.
 *  - img-src allows https: so product images (Supabase Storage or admin-entered
 *    URLs) load; tighten to your bucket domain if you host all images yourself.
 *  - dev needs 'unsafe-eval' for React Fast Refresh; production uses
 *    'strict-dynamic' with the nonce only.
 */
function buildCsp(): { nonce: string; csp: string } {
  const nonce = btoa(globalThis.crypto.randomUUID());
  const isProd = process.env.NODE_ENV === 'production';
  // No 'strict-dynamic': it would ignore 'self' and break statically-rendered
  // storefront pages (whose nonce cannot be per-request). 'self' + nonce still
  // blocks injected inline scripts and disallows foreign script origins.
  const scriptSrc = isProd
    ? `'self' 'nonce-${nonce}'`
    : `'self' 'nonce-${nonce}' 'unsafe-eval' 'unsafe-inline'`;
  const csp = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: https:`,
    `font-src 'self' data:`,
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ');
  return { nonce, csp };
}

/**
 * Refreshes the Supabase auth session on every request, applies a nonce-based
 * CSP, and gates the /admin area behind an authenticated session.
 *
 * NOTE: this only checks that a session EXISTS. Whether that user is actually an
 * authorised admin is enforced again server-side (admin layout guard + RLS on
 * every table). Middleware is a first gate, never the only one.
 */
export async function updateSession(request: NextRequest) {
  const { nonce, csp } = buildCsp();

  // Headers seen by the app/framework for this request (carry nonce + CSP).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Issue a guest device id (account-free wishlist) if the visitor lacks one.
  if (!request.cookies.get('vg_device')?.value) {
    const id = globalThis.crypto.randomUUID();
    request.cookies.set('vg_device', id);
    response.cookies.set('vg_device', id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
  }

  const path = request.nextUrl.pathname;
  const isAdminArea = path.startsWith('/admin');
  const isLogin = path === '/admin/login';

  if (isAdminArea && !isLogin && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('redirect', path);
    const redirectRes = NextResponse.redirect(url);
    redirectRes.headers.set('Content-Security-Policy', csp);
    return redirectRes;
  }

  // NOTE: we intentionally do NOT auto-redirect an authenticated user away from
  // /admin/login here. Whether the session belongs to an *active admin* is a DB
  // check (admin_users), which the login page performs itself — bouncing on mere
  // session presence would loop a deactivated/non-admin user between the two.

  response.headers.set('Content-Security-Policy', csp);
  return response;
}
