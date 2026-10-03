import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { InventoryService } from '@/src/inventory/inventory.service';

const inventoryService = new InventoryService(prisma);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const unit = await inventoryService.findOneUnit(id);
    return NextResponse.json(unit);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Unit tidak ditemukan' },
      { status: error.status || 404 }
    );
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const result = await inventoryService.upgradeUnit(id, body);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal memperbarui unit' },
      { status: error.status || 400 }
    );
  }
}
