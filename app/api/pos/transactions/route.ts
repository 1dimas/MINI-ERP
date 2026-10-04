import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PosService } from '@/src/pos/pos.service';

const posService = new PosService(prisma as any);

export async function GET(req: Request) {
  try {
    const roleHeader = (req.headers.get('x-user-role') || '') as string;

    // Akses riwayat: KASIR dan OWNER
    if (roleHeader !== 'OWNER' && roleHeader !== 'KASIR') {
      return NextResponse.json(
        { message: 'Akses ditolak ke riwayat transaksi kasir.' },
        { status: 403 }
      );
    }

    const transactions = await posService.getTransactions();
    return NextResponse.json(transactions);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal mengambil riwayat transaksi POS' },
      { status: 500 }
    );
  }
}
