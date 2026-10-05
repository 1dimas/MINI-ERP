import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { CashflowService } from '@/src/cashflow/cashflow.service';

const cashflowService = new CashflowService(prisma as any);

export async function POST(req: Request) {
  try {
    // KASIR tidak diizinkan membuat transaksi arus kas
    const auth = requireAuth(req, ['OWNER', 'FINANCE']);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const result = await cashflowService.create(body, {
      id: auth.id,
      role: auth.role,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal menyimpan transaksi arus kas' },
      { status: error.status || 400 }
    );
  }
}
