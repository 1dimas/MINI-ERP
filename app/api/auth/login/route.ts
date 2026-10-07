import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { signJwt } from '@/lib/auth-token';
import { getEffectivePermissions } from '@/lib/permissions';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const ipLimit = rateLimit(`login:ip:${ip}`, { max: 10, intervalMs: 60 * 1000 });
    if (!ipLimit.success) {
      return NextResponse.json(
        { message: `Terlalu banyak percobaan login. Silakan coba lagi dalam ${ipLimit.retryAfterSeconds} detik.` },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } }
      );
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email dan password wajib diisi' },
        { status: 400 }
      );
    }

    const emailLimit = rateLimit(`login:email:${email.toLowerCase().trim()}`, { max: 5, intervalMs: 60 * 1000 });
    if (!emailLimit.success) {
      return NextResponse.json(
        { message: `Akun ini terlalu banyak percobaan gagal. Silakan tunggu ${emailLimit.retryAfterSeconds} detik.` },
        { status: 429, headers: { 'Retry-After': String(emailLimit.retryAfterSeconds) } }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'Email atau password salah' },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Email atau password salah' },
        { status: 401 }
      );
    }

    const userStatus = user.status || 'ACTIVE';
    if (userStatus !== 'ACTIVE') {
      return NextResponse.json(
        {
          message:
            userStatus === 'SUSPENDED'
              ? 'Akun Anda sedang dinonaktifkan (SUSPENDED). Silakan hubungi Owner untuk masa pemulihan (grace period).'
              : 'Akun Anda telah diarsipkan permanen (ARCHIVED). Akses ditolak.',
        },
        { status: 403 }
      );
    }

    // ATURAN KRUSIAL: Jika isTwoFactorEnabled === true, kembalikan { requires2FA: true, userId: user.id }
    if (user.isTwoFactorEnabled) {
      return NextResponse.json({
        requires2FA: true,
        userId: user.id,
      });
    }

    // Terbitkan JWT token valid (1 hari)
    const token = await signJwt({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const effectivePermissions = getEffectivePermissions(user);
    const { password: _, twoFactorSecret: __, ...userClean } = user;

    const response = NextResponse.json({
      accessToken: token,
      access_token: token,
      user: {
        ...userClean,
        permissions: effectivePermissions,
      },
    });

    // Simpan ke cookies via Next.js response cookies (HttpOnly untuk keamanan dari XSS)
    const isProd = process.env.NODE_ENV === 'production';
    const cookieBaseOptions = {
      httpOnly: true,
      secure: isProd,
      path: '/',
      maxAge: 60 * 60 * 24,
      sameSite: 'lax' as const,
    };

    response.cookies.set('access_token', token, cookieBaseOptions);
    response.cookies.set('token', token, cookieBaseOptions);
    // Role non-sensitive cookie untuk helper ringan jika diperlukan client
    response.cookies.set('user_role', user.role || '', {
      ...cookieBaseOptions,
      httpOnly: false,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
