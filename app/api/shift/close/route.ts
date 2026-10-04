import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ShiftService } from '@/src/shift/shift.service';

const shiftService = new ShiftService(prisma as any);

export async function POST(req: Request) {
  try {
    const roleHeader = (req.headers.get('x-user-role') || 'KASIR') as string;
    const userIdHeader = req.headers.get('x-user-id') || 'demo-kasir-id';
    const userNameHeader = req.headers.get('x-user-name') || 'Budi Kasir';

    if (roleHeader !== 'KASIR' && roleHeader !== 'OWNER') {
      return NextResponse.json(
        { message: 'Akses ditolak. Hanya kasir atau owner yang dapat menutup shift.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = await shiftService.closeShift(
      { actualEndingCash: Number(body.actualEndingCash || 0) },
      { id: userIdHeader, name: userNameHeader, role: roleHeader }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    const status = error.status || (error.getStatus ? error.getStatus() : 400);
    return NextResponse.json(
      { message: error.message || 'Gagal menutup shift kasir' },
      { status }
    );
  }
}
