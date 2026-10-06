import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ message: 'User ID diperlukan' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        status: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ status: 'NOT_FOUND', active: false }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      status: user.status,
      active: user.status === 'ACTIVE',
      role: user.role,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal memeriksa status akun' },
      { status: 500 }
    );
  }
}
