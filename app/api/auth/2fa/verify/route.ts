import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verify } from 'otplib';
import { signJwt } from '@/lib/auth-token';
import { getEffectivePermissions } from '@/lib/permissions';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const ipLimit = rateLimit(`2fa:ip:${ip}`, { max: 10, intervalMs: 60 * 1000 });
    if (!ipLimit.success) {
      return NextResponse.json(
        { message: `Terlalu banyak percobaan OTP. Silakan coba lagi dalam ${ipLimit.retryAfterSeconds} detik.` },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } }
      );
    }

    const { userId, otp } = await req.json();

    if (!userId || !otp) {
      return NextResponse.json(
        { message: 'userId dan otp wajib diisi' },
        { status: 400 }
      );
    }

    const userLimit = rateLimit(`2fa:user:${userId}`, { max: 5, intervalMs: 60 * 1000 });
    if (!userLimit.success) {
      return NextResponse.json(
        { message: `Terlalu banyak salah OTP untuk akun ini. Silakan tunggu ${userLimit.retryAfterSeconds} detik.` },
        { status: 429, headers: { 'Retry-After': String(userLimit.retryAfterSeconds) } }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        {
          message:
            user.status === 'SUSPENDED'
              ? 'Akun Anda sedang dinonaktifkan (SUSPENDED).'
              : 'Akun Anda telah diarsipkan permanen (ARCHIVED). Akses ditolak.',
        },
        { status: 403 }
      );
    }

    if (!user.twoFactorSecret) {
      return NextResponse.json(
        { message: '2FA Secret belum dibuat untuk user ini' },
        { status: 400 }
      );
    }

    const isValid = verify({
      token: otp,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      return NextResponse.json(
        { message: 'Kode OTP 2FA tidak valid' },
        { status: 401 }
      );
    }

    if (!user.isTwoFactorEnabled) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isTwoFactorEnabled: true },
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
