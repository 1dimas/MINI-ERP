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
    const { role, resetPermissions, permissions } = body;

    if (!role || !['OWNER', 'FINANCE', 'KASIR'].includes(role)) {
      return NextResponse.json(
        { message: 'Role harus salah satu dari: OWNER, FINANCE, KASIR' },
        { status: 400 }
      );
    }

    const result = await accountService.updateRole(
      id,
      {
        role,
        resetPermissions: resetPermissions !== undefined ? Boolean(resetPermissions) : true,
        permissions,
      },
      auth.id
    );

    return NextResponse.json(result);
  } catch (error: any) {
    const status = error.status || (error.getStatus ? error.getStatus() : 500);
    return NextResponse.json(
      { message: error.message || 'Gagal mengubah role akun karyawan' },
      { status }
    );
  }
}
