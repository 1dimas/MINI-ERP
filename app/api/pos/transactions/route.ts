import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { PosService } from '@/src/pos/pos.service';

const posService = new PosService(prisma as any);

export async function GET(req: Request) {
  try {
    // Akses riwayat: KASIR dan OWNER
    const auth = requireAuth(req, ['KASIR', 'OWNER']);
    if (auth instanceof NextResponse) return auth;

    const transactions = await posService.getTransactions();
    return NextResponse.json(transactions);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal mengambil riwayat transaksi POS' },
      { status: 500 }
    );
  }
}
