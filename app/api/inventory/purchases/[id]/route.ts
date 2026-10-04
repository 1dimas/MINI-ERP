import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { InventoryService } from '@/src/inventory/inventory.service';

const inventoryService = new InventoryService(prisma);

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const roleHeader = req.headers.get('x-user-role') || 'FINANCE';

    if (roleHeader === 'KASIR') {
      return NextResponse.json(
        { message: 'Akses ditolak: Kasir tidak memiliki wewenang mengedit pembelian' },
        { status: 403 }
      );
    }

    const result = await inventoryService.updatePurchase(id, body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal memperbarui riwayat pembelian' },
      { status: error.status || 400 }
    );
  }
}
