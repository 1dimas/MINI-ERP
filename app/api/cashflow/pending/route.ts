import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { CashflowService } from '@/src/cashflow/cashflow.service';

const cashflowService = new CashflowService(prisma as any);

export async function GET(req: Request) {
  try {
    const auth = requireAuth(req, ['OWNER', 'FINANCE']);
    if (auth instanceof NextResponse) return auth;

    const result = await cashflowService.findPending();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal mengambil draf pending' },
      { status: 500 }
    );
  }
}
