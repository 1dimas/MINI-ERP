import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/auth-token';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cek apakah route yang diakses berada di bawah proteksi
  const isProtected =
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname === '/pos' ||
    pathname.startsWith('/pos/') ||
    pathname === '/inventory' ||
    pathname.startsWith('/inventory/') ||
    pathname === '/finance' ||
    pathname.startsWith('/finance/');

  if (!isProtected) {
    return NextResponse.next();
  }

  // Ambil token dari cookie: cek 'access_token' atau 'token'
  const token =
    request.cookies.get('access_token')?.value ||
    request.cookies.get('token')?.value;

  // Jika cookie token tidak ada, paksa redirect ke /login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verifikasi keabsahan JWT (tanda tangan & waktu kedaluwarsa)
  const payload = await verifyJwt(token);

  // Jika token invalid atau sudah expired, redirect ke /login dan bersihkan cookies
  if (!payload) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    loginUrl.searchParams.set('error', 'session_expired');

    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('access_token');
    response.cookies.delete('token');
    return response;
  }

  const userRole = (payload.role || '').toUpperCase();

  // ATURAN ROLE-BASED ACCESS CONTROL (RBAC):
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

  // Token & role valid, teruskan request dan sematkan identitas pengguna di headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.sub);
  requestHeaders.set('x-user-email', payload.email);
  requestHeaders.set('x-user-role', payload.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Konfigurasi matcher middleware Next.js
export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/pos',
    '/pos/:path*',
    '/inventory',
    '/inventory/:path*',
    '/finance',
    '/finance/:path*',
  ],
};
