import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PosService } from '@/src/pos/pos.service';
import { PaymentMethod } from '@/src/pos/dto/checkout.dto';

const posService = new PosService(prisma as any);

export async function POST(req: Request) {
  try {
    const roleHeader = (req.headers.get('x-user-role') || 'KASIR') as 'OWNER' | 'FINANCE' | 'KASIR';
    const userIdHeader = req.headers.get('x-user-id') || 'demo-kasir-id';
    const userNameHeader = req.headers.get('x-user-name') || 'Budi Kasir';

    // RBAC: Hanya KASIR dan OWNER yang dapat mengakses modul POS
    if (roleHeader === 'FINANCE') {
      return NextResponse.json(
        { message: 'Akses ditolak. FINANCE tidak diizinkan di terminal POS.' },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Kompatibilitas mundur: jika dipanggil dengan format lama { serialNumber, paymentAccountCode }
    let items = body.items;
    let paymentMethod = body.paymentMethod || PaymentMethod.CASH;
    let amountPaid = body.amountPaid;

    if (!items && body.serialNumber) {
      items = [body.serialNumber];
      if (amountPaid === undefined) {
        // Ambil harga unit dari database agar backward compatibility tetap mulus
        const unit = await prisma.productUnit.findUnique({
          where: { serialNumber: body.serialNumber.trim().toUpperCase() },
        });
        amountPaid = unit ? Number(unit.price) : 0;
      }
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { message: 'Serial Number (SN) item wajib diisi / di-scan!' },
        { status: 400 }
      );
    }

    const result = await posService.checkout(
      {
        paymentMethod,
        amountPaid: Number(amountPaid),
        items,
      },
      {
        id: userIdHeader,
        name: userNameHeader,
        role: roleHeader,
      }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    const status = error.status || (error.getStatus ? error.getStatus() : 400);
    return NextResponse.json(
      { message: error.message || 'Gagal memproses transaksi kasir' },
      { status }
    );
  }
}
