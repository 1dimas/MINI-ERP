import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { PosService } from '@/src/pos/pos.service';

const posService = new PosService(prisma as any);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ serialNumber: string }> }
) {
  try {
    // FINANCE tidak diizinkan di terminal POS
    const auth = requireAuth(req, ['KASIR', 'OWNER']);
    if (auth instanceof NextResponse) return auth;

    const { serialNumber } = await params;
    const unit = await posService.scanUnit(serialNumber);

    // Kasir tidak boleh melihat HPP (modal)
    if (auth.role === 'KASIR') {
      return NextResponse.json({ ...unit, hpp: null });
    }

    return NextResponse.json(unit);
  } catch (error: any) {
    const status = error.status || (error.getStatus ? error.getStatus() : 400);
    return NextResponse.json(
      { message: error.message || 'Gagal memindai unit' },
      { status }
    );
  }
}
