import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { AccountService } from '@/src/account/account.service';

const accountService = new AccountService(prisma as any);

export async function PATCH(req: Request) {
  try {
    const auth = requireAuth(req, ['OWNER', 'FINANCE', 'KASIR']);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { oldPassword, newPassword, newEmail } = body;

    if (!oldPassword) {
      return NextResponse.json(
        { message: 'Password saat ini (lama) wajib diisi untuk verifikasi identitas' },
        { status: 400 }
      );
    }

    const result = await accountService.updateSelf(auth.id, {
      oldPassword,
      newPassword,
      newEmail,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    const status = error.status || (error.getStatus ? error.getStatus() : 500);
    return NextResponse.json(
      { message: error.message || 'Gagal memperbarui profil akun' },
      { status }
    );
  }
}
