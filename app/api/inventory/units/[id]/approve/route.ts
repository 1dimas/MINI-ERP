import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { InventoryService } from '@/src/inventory/inventory.service';

const inventoryService = new InventoryService(prisma);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const roleHeader = (req.headers.get('x-user-role') || 'OWNER') as 'OWNER' | 'FINANCE' | 'KASIR';
    const userIdHeader = req.headers.get('x-user-id') || 'demo-owner-id';

    const result = await inventoryService.approveUnit(id, {
      id: userIdHeader,
      role: roleHeader,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal menyetujui unit' },
      { status: error.status || 400 }
    );
  }
}
