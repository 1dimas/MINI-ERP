import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { JournalService } from '@/src/journal/journal.service';

const journalService = new JournalService(prisma as any);

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const roleHeader = req.headers.get('x-user-role') || 'FINANCE';
    const userIdHeader = req.headers.get('x-user-id') || 'demo-user-id';

    const result = await journalService.updateManual(id, body, {
      id: userIdHeader,
      role: roleHeader,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal memperbarui jurnal' },
      { status: error.status || 400 }
    );
  }
}
