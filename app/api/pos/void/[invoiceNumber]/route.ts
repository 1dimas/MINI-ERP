import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PosService } from '@/src/pos/pos.service';

const posService = new PosService(prisma as any);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ invoiceNumber: string }> }
) {
  try {
    const roleHeader = (req.headers.get('x-user-role') || '') as string;
    const userIdHeader = req.headers.get('x-user-id') || 'owner-id';
    const userNameHeader = req.headers.get('x-user-name') || 'Dimas Owner';

    // Otorisasi ketat: HANYA OWNER
    if (roleHeader !== 'OWNER') {
      return NextResponse.json(
        {
          message:
            'Akses ditolak. Hanya role OWNER yang memiliki hak akses untuk membatalkan (VOID) transaksi kasir.',
        },
        { status: 403 }
      );
    }

    const { invoiceNumber } = await params;
    const result = await posService.voidTransaction(invoiceNumber, {
      id: userIdHeader,
      name: userNameHeader,
      role: roleHeader,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    const status = error.status || (error.getStatus ? error.getStatus() : 400);
    return NextResponse.json(
      { message: error.message || 'Gagal memproses pembatalan (VOID) transaksi' },
      { status }
    );
  }
}
