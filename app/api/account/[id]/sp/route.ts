import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { AccountService } from '@/src/account/account.service';

const accountService = new AccountService(prisma as any);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(req, ['OWNER']);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await req.json();
    const { reason } = body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { message: 'Alasan penerbitan Surat Peringatan (SP) wajib diisi' },
        { status: 400 }
      );
    }

    const result = await accountService.issueWarningLetter(id, auth.id, {
      reason: reason.trim(),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    const status = error.status || (error.getStatus ? error.getStatus() : 500);
    return NextResponse.json(
      { message: error.message || 'Gagal menerbitkan Surat Peringatan (SP)' },
      { status }
    );
  }
}
