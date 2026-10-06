import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { AccountService } from '@/src/account/account.service';

const accountService = new AccountService(prisma as any);

export async function POST(req: Request) {
  try {
    const auth = requireAuth(req, ['OWNER']);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { message: 'Nama, email, password, dan role wajib diisi' },
        { status: 400 }
      );
    }

    const newUser = await accountService.createAccount({
      name,
      email,
      password,
      role,
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    const status = error.status || (error.getStatus ? error.getStatus() : 500);
    return NextResponse.json(
      { message: error.message || 'Gagal menambahkan akun karyawan' },
      { status }
    );
  }
}
