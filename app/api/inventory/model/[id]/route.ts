import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { InventoryService } from '@/src/inventory/inventory.service';

const inventoryService = new InventoryService(prisma);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const model = await inventoryService.findModelWithUnits(id);
    return NextResponse.json(model);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Katalog Induk tidak ditemukan' },
      { status: error.status || 404 }
    );
  }
}
