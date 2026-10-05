import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { InventoryService } from '@/src/inventory/inventory.service';

const inventoryService = new InventoryService(prisma);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Checker/Otorisasi QC inventory: HANYA OWNER!
    const auth = requireAuth(req, ['OWNER']);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const result = await inventoryService.approveUnit(id, {
      id: auth.id,
      role: auth.role,
      name: auth.name,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal menyetujui unit' },
      { status: error.status || 400 }
    );
  }
}
