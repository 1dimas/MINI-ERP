import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { signJwt } from '@/lib/auth-token';

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

    if (user.status === 'BANNED') {
      return NextResponse.json(
        { message: 'Akun Anda telah dinonaktifkan/dibekukan (BANNED). Silakan hubungi Owner.' },
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

    const { password: _, twoFactorSecret: __, ...userClean } = user;

    const response = NextResponse.json({
      accessToken: token,
      access_token: token,
      user: userClean,
    });

    // Simpan ke cookies via Next.js response cookies
    response.cookies.set('access_token', token, {
      httpOnly: false, // Memungkinkan js-cookie membaca atau memodifikasi jika diperlukan
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
