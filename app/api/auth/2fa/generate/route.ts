import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { generateSecret, generateURI } from 'otplib';
import QRCode from 'qrcode';

export async function POST(req: Request) {
  try {
    const auth = requireAuth(req, ['OWNER', 'FINANCE', 'KASIR']);
    if (auth instanceof NextResponse) return auth;

    const { userId } = await req.json();

    const targetUserId = userId || auth.id;

    // Hanya boleh generate untuk diri sendiri, KECUALI jika role adalah OWNER
    if (auth.role !== 'OWNER' && targetUserId !== auth.id) {
      return NextResponse.json(
        { message: 'Akses ditolak. Anda hanya dapat mengatur 2FA untuk akun Anda sendiri.' },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
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
      label: user.email,
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
