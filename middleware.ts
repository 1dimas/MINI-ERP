import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/auth-token';
import { AUTH_HEADERS } from '@/lib/api-auth';

/**
 * Endpoint API publik (boleh diakses TANPA JWT).
 * - login            : menerbitkan JWT
 * - register         : hanya berlaku untuk user pertama (dijaga di route)
 * - 2fa/verify       : langkah ke-2 login bagi user ber-2FA (belum punya JWT)
 */
const PUBLIC_API_ROUTES = ['/api/auth/login', '/api/auth/register', '/api/auth/2fa/verify'];

function extractToken(request: NextRequest): string | undefined {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return request.cookies.get('access_token')?.value || request.cookies.get('token')?.value;
}

/**
 * Header baru TANPA header identitas kiriman client.
 * Wajib dipanggil untuk SETIAP request agar `x-user-*` tidak bisa dipalsukan.
 */
function stripIdentityHeaders(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  Object.values(AUTH_HEADERS).forEach((h) => headers.delete(h));
  return headers;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname === '/api' || pathname.startsWith('/api/');
  const requestHeaders = stripIdentityHeaders(request);

  // ── API publik: teruskan, tapi tetap tanpa header identitas palsu ──
  if (isApi && PUBLIC_API_ROUTES.includes(pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const token = extractToken(request);
  const payload = token ? await verifyJwt(token) : null;

  // ── API privat: token wajib valid, jawab 401 JSON (bukan redirect) ──
  if (isApi) {
    if (!payload) {
      return NextResponse.json(
        { message: 'Unauthorized. Sesi tidak valid atau telah kedaluwarsa, silakan login ulang.' },
        { status: 401 },
      );
    }
  } else if (!payload) {
    // ── Halaman privat: redirect ke /login ──
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    if (token) loginUrl.searchParams.set('error', 'session_expired');

    const response = NextResponse.redirect(loginUrl);
    if (token) {
      response.cookies.delete('access_token');
      response.cookies.delete('token');
    }
    return response;
  }

  const userRole = (payload.role || '').toUpperCase();

  // ATURAN ROLE-BASED ACCESS CONTROL (RBAC) HALAMAN:
  // (RBAC level API dijaga per-route via `requireAuth()` di lib/api-auth.ts)
  if (!isApi) {
    // 1. Role KASIR:
    //    - Bisa akses: /pos (terminal pembayaran kasir) dan /inventory (katalog/cek stok barang saja)
    //    - DILARANG akses: /dashboard dan /finance (modul akuntansi & keuangan internal)
    if (userRole === 'KASIR') {
      if (
        pathname === '/dashboard' ||
        pathname.startsWith('/dashboard/') ||
        pathname === '/finance' ||
        pathname.startsWith('/finance/')
      ) {
        return NextResponse.redirect(new URL('/pos', request.url));
      }
    }

    // 2. Role FINANCE:
    //    - Bisa akses: /dashboard, /inventory, /finance (kelola barang, akuntansi, arus kas/cashflow, jurnal)
    //    - DILARANG akses: /pos (kasir terpisah, penjualan kasir otomatis masuk ke cashflow)
    if (userRole === 'FINANCE') {
      if (pathname === '/pos' || pathname.startsWith('/pos/')) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // 3. Role OWNER:
    //    - Super Admin: Bebas melihat dan mengakses SELURUH modul (/dashboard, /inventory, /finance, /pos)
  }

  // Token & role valid: sematkan identitas ASLI dari JWT (bukan dari client)
  requestHeaders.set(AUTH_HEADERS.id, payload.sub);
  requestHeaders.set(AUTH_HEADERS.email, payload.email || '');
  requestHeaders.set(AUTH_HEADERS.role, userRole);
  // Header HTTP hanya boleh ASCII → encode nama (bisa mengandung karakter non-ASCII)
  requestHeaders.set(AUTH_HEADERS.name, encodeURIComponent(payload.name || payload.email || ''));

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Konfigurasi matcher middleware Next.js
export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard',
    '/dashboard/:path*',
    '/pos',
    '/pos/:path*',
    '/inventory',
    '/inventory/:path*',
    '/finance',
    '/finance/:path*',
    '/2fa-setup',
    '/print/:path*',
  ],
};
