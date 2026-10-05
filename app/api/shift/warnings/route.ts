import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { ShiftService } from '@/src/shift/shift.service';

const shiftService = new ShiftService(prisma as any);

export async function GET(req: Request) {
  try {
    const auth = requireAuth(req, ['OWNER']);
    if (auth instanceof NextResponse) return auth;

    const warnings = await shiftService.getOverdueShiftWarnings({ role: auth.role });
    return NextResponse.json(warnings);
  } catch (error: any) {
    const status = error.status || (error.getStatus ? error.getStatus() : 500);
    return NextResponse.json(
      { message: error.message || 'Gagal memuat data peringatan shift' },
      { status }
    );
  }
}
