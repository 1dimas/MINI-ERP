import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { CashflowService } from '@/src/cashflow/cashflow.service';

const prisma = new PrismaClient();
const cashflowService = new CashflowService(prisma as any);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const roleHeader = req.headers.get('x-user-role') || 'FINANCE';
    const userIdHeader = req.headers.get('x-user-id') || 'demo-user-id';

    const result = await cashflowService.create(body, {
      id: userIdHeader,
      role: roleHeader,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal menyimpan transaksi arus kas' },
      { status: error.status || 400 }
    );
  }
}
