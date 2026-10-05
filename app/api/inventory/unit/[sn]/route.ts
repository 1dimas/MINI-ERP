import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { InventoryService } from '@/src/inventory/inventory.service';

const inventoryService = new InventoryService(prisma);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sn: string }> }
) {
  try {
    const auth = requireAuth(req, ['OWNER', 'FINANCE', 'KASIR']);
    if (auth instanceof NextResponse) return auth;

    const { sn } = await params;
    const unit = await inventoryService.findOneUnit(sn);

    // Kasir tidak boleh melihat nominal HPP
    if (auth.role === 'KASIR') {
      return NextResponse.json({
        ...unit,
        hpp: null,
        purchaseJournal: null,
      });
    }

    return NextResponse.json(unit);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Unit tidak ditemukan' },
      { status: error.status || 404 }
    );
  }
}
