import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { JournalService } from '@/src/journal/journal.service';

const prisma = new PrismaClient();
const journalService = new JournalService(prisma as any);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const result = await journalService.auditStatus(id, body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal mengeksekusi audit jurnal' },
      { status: error.status || 400 }
    );
  }
}
