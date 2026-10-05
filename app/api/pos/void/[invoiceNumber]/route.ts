import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { PosService } from '@/src/pos/pos.service';

const posService = new PosService(prisma as any);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ invoiceNumber: string }> }
) {
  try {
    // Otorisasi ketat: HANYA OWNER yang boleh membatalkan (VOID) transaksi kasir
    const auth = requireAuth(req, ['OWNER']);
    if (auth instanceof NextResponse) return auth;

    const { invoiceNumber } = await params;
    const result = await posService.voidTransaction(invoiceNumber, {
      id: auth.id,
      name: auth.name,
      role: auth.role,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    const status = error.status || (error.getStatus ? error.getStatus() : 400);
    return NextResponse.json(
      { message: error.message || 'Gagal memproses pembatalan (VOID) transaksi' },
      { status }
    );
  }
}
