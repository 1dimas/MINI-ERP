import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateSecret, generateURI } from 'otplib';
import QRCode from 'qrcode';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { message: 'userId wajib diisi' },
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

    const secret = generateSecret();

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret },
    });

    const otpauthUrl = generateURI({
      secret,
      accountName: user.email,
      issuer: 'MyToko POS',
    });
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    return NextResponse.json({
      qrCodeUrl,
      secret,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
