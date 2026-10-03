import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email dan password wajib diisi' },
        { status: 400 }
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

    // ATURAN KRUSIAL: Jika isTwoFactorEnabled === true, kembalikan { requires2FA: true, userId: user.id }
    if (user.isTwoFactorEnabled) {
      return NextResponse.json({
        requires2FA: true,
        userId: user.id,
      });
    }

    // Token simulasi / session JWT
    const { password: _, twoFactorSecret: __, ...userClean } = user;
    const mockAccessToken = `jwt-token-demo-${user.id}-${Date.now()}`;

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
