import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verify } from 'otplib';
import { signJwt } from '@/lib/auth-token';

export async function POST(req: Request) {
  try {
    const { userId, otp } = await req.json();

    if (!userId || !otp) {
      return NextResponse.json(
        { message: 'userId dan otp wajib diisi' },
        { status: 400 }
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

    const { password: _, twoFactorSecret: __, ...userClean } = user;

    const response = NextResponse.json({
      accessToken: token,
      access_token: token,
      user: userClean,
    });

    // Simpan ke cookies via Next.js response cookies
    response.cookies.set('access_token', token, {
      httpOnly: false,
      path: '/',
      maxAge: 60 * 60 * 24,
      sameSite: 'lax',
    });
    response.cookies.set('token', token, {
      httpOnly: false,
      path: '/',
      maxAge: 60 * 60 * 24,
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
