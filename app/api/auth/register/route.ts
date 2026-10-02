import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, name, password, role } = await req.json();

    if (!email || !name || !password) {
      return NextResponse.json(
        { message: 'Email, nama, dan password wajib diisi' },
        { status: 400 }
      );
    }

    // Cek apakah sudah ada user di sistem (First-user registration only rule)
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return NextResponse.json(
        { message: 'Registrasi ditutup. Sistem sudah memiliki akun awal.' },
        { status: 403 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role || 'OWNER',
      },
    });

    const { password: _, twoFactorSecret: __, ...userClean } = user;
    return NextResponse.json(userClean, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
