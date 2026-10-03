import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AccountingService } from '@/src/accounting/accounting.service';

const accountingService = new AccountingService(prisma as any);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ accountCode: string }> }
) {
  try {
    const { accountCode } = await params;
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const data = await accountingService.getLedger(accountCode, { startDate, endDate });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal memuat Buku Besar' },
      { status: 500 }
    );
  }
}
