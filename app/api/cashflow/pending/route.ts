import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { CashflowService } from '@/src/cashflow/cashflow.service';

const prisma = new PrismaClient();
const cashflowService = new CashflowService(prisma as any);

export async function GET() {
  try {
    const result = await cashflowService.findPending();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal mengambil draf pending' },
      { status: 500 }
    );
  }
}
