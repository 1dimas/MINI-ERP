import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CashflowService } from '@/src/cashflow/cashflow.service';

const cashflowService = new CashflowService(prisma as any);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await cashflowService.approve(id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal menyetujui transaksi' },
      { status: error.status || 400 }
    );
  }
}
