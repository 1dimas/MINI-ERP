import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { InventoryService } from '@/src/inventory/inventory.service';

const inventoryService = new InventoryService(prisma);

export async function GET(req: Request) {
  try {
    const auth = requireAuth(req, ['OWNER', 'FINANCE', 'KASIR']);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const grade = searchParams.get('grade') || undefined;

    const data = await inventoryService.findAllUnits({
      status,
      search,
      grade,
      role: auth.role,
    });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal mengambil data inventaris' },
      { status: error.status || 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // Restock/penerimaan unit hanya oleh OWNER atau FINANCE
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
      { message: error.message || 'Gagal menyimpan unit laptop baru' },
      { status: error.status || 400 }
    );
  }
}
