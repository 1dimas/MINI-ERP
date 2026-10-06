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
        suspendedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ status: 'NOT_FOUND', active: false }, { status: 404 });
    }

    const userStatus = user.status || 'ACTIVE';

    if (userStatus === 'SUSPENDED' && user.suspendedAt) {
      const diffDays = Math.floor(
        (Date.now() - new Date(user.suspendedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays > 21) {
        await prisma.user.update({
          where: { id: user.id },
          data: { status: 'ARCHIVED' },
        });
        return NextResponse.json({
          id: user.id,
          status: 'ARCHIVED',
          active: false,
          role: user.role,
        });
      }
    }

    return NextResponse.json({
      id: user.id,
      status: userStatus,
      active: userStatus === 'ACTIVE',
      role: user.role,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal memeriksa status akun' },
      { status: 500 }
    );
  }
}
