import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PosService } from '@/src/pos/pos.service';

const posService = new PosService(prisma as any);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ serialNumber: string }> }
) {
  try {
    const roleHeader = (req.headers.get('x-user-role') || 'KASIR') as 'OWNER' | 'FINANCE' | 'KASIR';

    if (roleHeader === 'FINANCE') {
      return NextResponse.json(
        { message: 'Akses ditolak. FINANCE tidak diizinkan di terminal POS.' },
        { status: 403 }
      );
    }

    const { serialNumber } = await params;
    const unit = await posService.scanUnit(serialNumber);

    return NextResponse.json(unit);
  } catch (error: any) {
    const status = error.status || (error.getStatus ? error.getStatus() : 400);
    return NextResponse.json(
      { message: error.message || 'Gagal memindai unit' },
      { status }
    );
  }
}
