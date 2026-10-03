import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { InventoryService } from '@/src/inventory/inventory.service';

const inventoryService = new InventoryService(prisma);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const result = await inventoryService.rejectUnit(id, body.reason);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal menolak unit' },
      { status: error.status || 400 }
    );
  }
}
