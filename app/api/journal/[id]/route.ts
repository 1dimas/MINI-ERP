import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { JournalService } from '@/src/journal/journal.service';

const journalService = new JournalService(prisma as any);

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(req, ['OWNER', 'FINANCE']);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await req.json();

    const result = await journalService.updateManual(id, body, {
      id: auth.id,
      role: auth.role,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal memperbarui jurnal' },
      { status: error.status || 400 }
    );
  }
}
