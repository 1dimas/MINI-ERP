import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { InventoryService } from '@/src/inventory/inventory.service';

const inventoryService = new InventoryService(prisma);

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Edit riwayat pembelian hanya diperbolehkan untuk OWNER dan FINANCE
    const auth = requireAuth(req, ['OWNER', 'FINANCE']);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await req.json();

    const result = await inventoryService.updatePurchase(id, body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal memperbarui riwayat pembelian' },
      { status: error.status || 400 }
    );
  }
}
