import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { JournalService } from '@/src/journal/journal.service';

const journalService = new JournalService(prisma as any);

export async function GET(req: Request) {
  try {
    const auth = requireAuth(req, ['OWNER', 'FINANCE']);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const sourceType = searchParams.get('sourceType') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const data = await journalService.findAll({ status, sourceType, startDate, endDate });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal memuat riwayat jurnal' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // FINANCE -> DRAFT, OWNER -> POSTED (diputuskan di service berdasarkan role JWT)
    const auth = requireAuth(req, ['OWNER', 'FINANCE']);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const result = await journalService.createManual(body, {
      id: auth.id,
      role: auth.role,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal membuat jurnal manual' },
      { status: error.status || 400 }
    );
  }
}
