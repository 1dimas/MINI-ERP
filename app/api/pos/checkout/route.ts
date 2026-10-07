import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { PosService } from '@/src/pos/pos.service';
import { PaymentMethod } from '@/src/pos/dto/checkout.dto';

const posService = new PosService(prisma as any);

export async function POST(req: Request) {
  try {
    // RBAC: Hanya KASIR dan OWNER yang dapat mengakses modul POS
    const auth = requireAuth(req, ['KASIR', 'OWNER']);
    if (auth instanceof NextResponse) return auth;

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

    if (!Array.isArray(items) || items.length === 0 || !items.every((it) => typeof it === 'string' && it.trim())) {
      return NextResponse.json(
        { message: 'Serial Number (SN) item wajib diisi / di-scan dengan benar!' },
        { status: 400 }
      );
    }

    const numericAmount = Number(amountPaid);
    if (isNaN(numericAmount) || numericAmount < 0) {
      return NextResponse.json(
        { message: 'Nominal pembayaran tidak valid atau bernilai negatif.' },
        { status: 400 }
      );
    }

    // Identitas kasir murni dari JWT (diinjeksi middleware), bukan dari body/header client
    const result = await posService.checkout(
      {
        paymentMethod,
        amountPaid: numericAmount,
        items,
      },
      {
        id: auth.id,
        name: auth.name,
        email: auth.email,
        role: auth.role,
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
