import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { AccountService } from '@/src/account/account.service';

const accountService = new AccountService(prisma as any);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(req, ['OWNER']);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await req.json();
    const { permissions } = body;

    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { message: 'Permissions harus berupa array kode fitur' },
        { status: 400 }
      );
    }

    const result = await accountService.updatePermissions(id, permissions);
    return NextResponse.json(result);
  } catch (error: any) {
    const status = error.status || (error.getStatus ? error.getStatus() : 500);
    return NextResponse.json(
      { message: error.message || 'Gagal memperbarui hak akses fitur karyawan' },
      { status }
    );
  }
}
