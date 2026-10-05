import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { JournalService } from '@/src/journal/journal.service';

const journalService = new JournalService(prisma as any);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Audit jurnal: FINANCE & OWNER (sesuai spesifikasi JournalService.auditStatus)
    const auth = requireAuth(req, ['OWNER', 'FINANCE']);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await req.json();

    const result = await journalService.auditStatus(id, body, {
      id: auth.id,
      role: auth.role,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal mengeksekusi audit jurnal' },
      { status: error.status || 400 }
    );
  }
}
