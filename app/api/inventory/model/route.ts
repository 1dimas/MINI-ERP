import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { InventoryService } from '@/src/inventory/inventory.service';

const inventoryService = new InventoryService(prisma);

export async function GET() {
  try {
    const models = await inventoryService.findAllModels();
    return NextResponse.json(models);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal mengambil data Katalog Induk' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await inventoryService.createModel(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal membuat Katalog Induk (ProductModel)' },
      { status: error.status || 400 }
    );
  }
}
