import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { ShiftService } from '@/src/shift/shift.service';

const shiftService = new ShiftService(prisma as any);

export async function POST(req: Request) {
  try {
    // Hanya kasir atau owner yang dapat menutup shift (miliknya sendiri)
    const auth = requireAuth(req, ['KASIR', 'OWNER']);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const result = await shiftService.closeShift(
      { actualEndingCash: Number(body.actualEndingCash || 0) },
      { id: auth.id, name: auth.name, role: auth.role }
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
