import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { JournalService } from '@/src/journal/journal.service';

const prisma = new PrismaClient();
const journalService = new JournalService(prisma as any);

export async function GET(req: Request) {
  try {
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
    const body = await req.json();
    const roleHeader = req.headers.get('x-user-role') || 'FINANCE';
    const userIdHeader = req.headers.get('x-user-id') || 'demo-user-id';

    const result = await journalService.createManual(body, {
      id: userIdHeader,
      role: roleHeader,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal membuat jurnal manual' },
      { status: error.status || 400 }
    );
  }
}
