import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { AccountService } from '@/src/account/account.service';

const accountService = new AccountService(prisma as any);

export async function GET(req: Request) {
  try {
    const auth = requireAuth(req, ['OWNER']);
    if (auth instanceof NextResponse) return auth;

    const history = await accountService.getHistoryAccounts();
    return NextResponse.json(history);
  } catch (error: any) {
    const status = error.status || (error.getStatus ? error.getStatus() : 500);
    return NextResponse.json(
      { message: error.message || 'Gagal memuat riwayat mantan karyawan' },
      { status }
    );
  }
}
