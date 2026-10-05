import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { InventoryService } from '@/src/inventory/inventory.service';

const inventoryService = new InventoryService(prisma);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(req, ['OWNER', 'FINANCE', 'KASIR']);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const model = await inventoryService.findModelWithUnits(id);

    // Jika KASIR, sembunyikan nominal HPP dan jurnal pembelian pada masing-masing unit
    if (auth.role === 'KASIR' && model && model.units) {
      model.units = model.units.map((u: any) => ({
        ...u,
        hpp: null,
        purchaseJournal: null,
      })) as any;
    }

    return NextResponse.json(model);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Katalog Induk tidak ditemukan' },
      { status: error.status || 404 }
    );
  }
}
