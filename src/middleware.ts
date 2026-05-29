import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// This middleware runs on the Vercel Edge Network / Cloudflare Workers
// It intercepts requests to enforce tenant resolution based on subdomains or headers.

const ALLOWED_ENVIRONMENTS = ['development', 'staging', 'production'];
const CURRENT_ENV = process.env.NEXT_PUBLIC_APP_ENV || 'development';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_must_change_for_production_use_123'
);

export async function middleware(request: NextRequest) {
  // 1. Edge-based multi-region/tenant routing extraction
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  
  // Exclude static assets
  if (url.pathname.startsWith('/_next') || url.pathname.includes('.')) {
    return NextResponse.next();
  }

  // 2. Tenant Extraction Logic (Subdomain-based)
  // e.g. tenant-a.asas-os.com -> tenantId: tenant-a
  const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'asas-os.com';
  let tenantId = 'unknown';

  if (hostname.includes(mainDomain)) {
    const subdomain = hostname.replace(`.${mainDomain}`, '');
    if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
      tenantId = subdomain;
    }
  }

  // Fallback for custom header (API calls or local dev)
  if (tenantId === 'unknown') {
    tenantId = request.headers.get('x-tenant-id') || 'unknown';
  }

  // 3. Clone and inject headers for downstream services to use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-resolved-tenant', tenantId);
  requestHeaders.set('x-environment', CURRENT_ENV);

  // 4. Region awareness (Vercel provides x-vercel-ip-country, etc)
  const region = request.headers.get('x-vercel-ip-country') || 'global';
  requestHeaders.set('x-client-region', region);

  // Determine auth status securely at edge
  let isAuthenticated = false;
  let identityTenant = '';

  const tokenCookie = request.cookies.get('asas_access_token')?.value;
  const authHeader = request.headers.get('authorization');
  
  // Accept standard Bearer headers for API, or Cookies for web
  let token = tokenCookie;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET);
      if (payload && payload.userId) {
        isAuthenticated = true;
        identityTenant = payload.tenantId as string;
      }
    } catch (err) {
      // invalid token
    }
  }

  // 5. Protected Route Guard (Dashboard boundary)
  if (url.pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Optional: enforce URL tenant matches JWT tenant if needed
  }

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // 6. Global Security Headers Enforcements
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  return response;
}

export const config = {
  matcher: [
    '/((?!api/webhook|_next/static|_next/image|favicon.ico).*)',
  ],
};
