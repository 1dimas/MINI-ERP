import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ShiftService } from '@/src/shift/shift.service';

const shiftService = new ShiftService(prisma as any);

export async function GET(req: Request) {
  try {
    const roleHeader = (req.headers.get('x-user-role') || 'KASIR') as string;
    const userIdHeader = req.headers.get('x-user-id') || 'demo-kasir-id';

    if (roleHeader !== 'KASIR' && roleHeader !== 'OWNER') {
      return NextResponse.json(
        { message: 'Akses ditolak.' },
        { status: 403 }
      );
    }

    const result = await shiftService.getCurrentShift(userIdHeader);
    return NextResponse.json(result);
  } catch (error: any) {
    const status = error.status || (error.getStatus ? error.getStatus() : 400);
    return NextResponse.json(
      { message: error.message || 'Gagal memuat status shift aktif' },
      { status }
    );
  }
}
