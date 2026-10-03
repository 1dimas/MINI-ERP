import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { InventoryService } from '@/src/inventory/inventory.service';

const inventoryService = new InventoryService(prisma);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { serialNumber, paymentAccountCode } = body;

    if (!serialNumber) {
      return NextResponse.json(
        { message: 'Serial Number (SN) wajib diisi / di-scan!' },
        { status: 400 }
      );
    }

    const roleHeader = (req.headers.get('x-user-role') || 'KASIR') as 'OWNER' | 'FINANCE' | 'KASIR';
    const userIdHeader = req.headers.get('x-user-id') || 'demo-kasir-id';
    const userNameHeader = req.headers.get('x-user-name') || 'Budi Kasir';

    const result = await inventoryService.checkoutPos(
      serialNumber,
      { id: userIdHeader, role: roleHeader, name: userNameHeader },
      paymentAccountCode || '110'
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal memproses transaksi kasir' },
      { status: error.status || 400 }
    );
  }
}
