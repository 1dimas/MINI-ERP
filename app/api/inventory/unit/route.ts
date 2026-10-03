import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { InventoryService } from '@/src/inventory/inventory.service';

const inventoryService = new InventoryService(prisma);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const roleHeader = req.headers.get('x-user-role') || 'FINANCE';
    const userIdHeader = req.headers.get('x-user-id') || 'demo-user-id';
    const userNameHeader = req.headers.get('x-user-name') || 'Staf Keuangan';

    const result = await inventoryService.createUnit(body, {
      id: userIdHeader,
      role: roleHeader,
      name: userNameHeader,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal menyimpan unit fisik laptop baru' },
      { status: error.status || 400 }
    );
  }
}
