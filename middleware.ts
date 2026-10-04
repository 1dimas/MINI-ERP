import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/auth-token';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cek apakah route yang diakses berada di bawah /dashboard atau /pos
  const isProtected =
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname === '/pos' ||
    pathname.startsWith('/pos/');

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

  // Token valid, teruskan request dan teruskan identitas pengguna di headers
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
  matcher: ['/dashboard', '/dashboard/:path*', '/pos', '/pos/:path*'],
};
