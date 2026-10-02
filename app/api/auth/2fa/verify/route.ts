import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verify } from 'otplib';

const prisma = new PrismaClient();

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

    const { password: _, twoFactorSecret: __, ...userClean } = user;
    const mockAccessToken = `jwt-token-final-2fa-${user.id}-${Date.now()}`;

    return NextResponse.json({
      accessToken: mockAccessToken,
      user: userClean,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
