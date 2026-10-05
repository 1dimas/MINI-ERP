import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { CashflowService } from '@/src/cashflow/cashflow.service';

const cashflowService = new CashflowService(prisma as any);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Hanya OWNER yang berhak menolak transaksi
    const auth = requireAuth(req, ['OWNER']);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const result = await cashflowService.reject(id, { id: auth.id, role: auth.role });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal membatalkan transaksi' },
      { status: error.status || 400 }
    );
  }
}
