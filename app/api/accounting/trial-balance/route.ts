import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AccountingService } from '@/src/accounting/accounting.service';

const prisma = new PrismaClient();
const accountingService = new AccountingService(prisma as any);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const data = await accountingService.getTrialBalance({ startDate, endDate });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal memuat Neraca Saldo' },
      { status: 500 }
    );
  }
}
