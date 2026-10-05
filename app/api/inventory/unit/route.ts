import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { InventoryService } from '@/src/inventory/inventory.service';

const inventoryService = new InventoryService(prisma);

export async function POST(req: Request) {
  try {
    const auth = requireAuth(req, ['OWNER', 'FINANCE']);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();

    const result = await inventoryService.createUnit(body, {
      id: auth.id,
      role: auth.role,
      name: auth.name,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal menyimpan unit fisik laptop baru' },
      { status: error.status || 400 }
    );
  }
}
