import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { InventoryService } from '@/src/inventory/inventory.service';

const inventoryService = new InventoryService(prisma);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sn: string }> }
) {
  try {
    const { sn } = await params;
    const unit = await inventoryService.findOneUnit(sn);
    return NextResponse.json(unit);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Unit tidak ditemukan' },
      { status: error.status || 404 }
    );
  }
}
