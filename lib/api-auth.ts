import { NextResponse } from 'next/server';

/**
 * Identitas user untuk API Route.
 *
 * SUMBER KEBENARAN TUNGGAL: header `x-user-*` yang DIINJEKSI oleh `middleware.ts`
 * setelah memverifikasi JWT. Middleware selalu menghapus header `x-user-*` kiriman
 * client terlebih dahulu, sehingga nilai di sini tidak bisa dipalsukan via Postman/curl.
 *
 * Fail-safe: tidak ada fallback string ("OWNER", "demo-user-id", dst). Header kosong = 403.
 */

export type AppRole = 'OWNER' | 'FINANCE' | 'KASIR';

export const ALL_ROLES: AppRole[] = ['OWNER', 'FINANCE', 'KASIR'];

export interface AuthUser {
  id: string;
  role: AppRole;
  email: string;
  name: string;
}

export const AUTH_HEADERS = {
  id: 'x-user-id',
  role: 'x-user-role',
  email: 'x-user-email',
  name: 'x-user-name',
  status: 'x-user-status',
} as const;

function forbidden(message: string) {
  return NextResponse.json({ message }, { status: 403 });
}

/**
 * Ambil user terautentikasi + validasi role.
 * Mengembalikan `AuthUser` jika lolos, atau `NextResponse` 403 jika ditolak.
 *
 * Pemakaian:
 *   const auth = requireAuth(req, ['OWNER']);
 *   if (auth instanceof NextResponse) return auth;
 */
export function requireAuth(
  req: Request,
  allowedRoles: AppRole[] = ALL_ROLES,
): AuthUser | NextResponse {
  const id = req.headers.get(AUTH_HEADERS.id);
  const role = (req.headers.get(AUTH_HEADERS.role) || '').toUpperCase() as AppRole;
  const status = req.headers.get(AUTH_HEADERS.status) || 'ACTIVE';

  if (status === 'BANNED') {
    return NextResponse.json(
      { message: 'Akun Anda telah dinonaktifkan/dibekukan (BANNED). Akses ditolak.' },
      { status: 401 }
    );
  }

  if (!id || !role || !ALL_ROLES.includes(role)) {
    return forbidden('Akses ditolak. Identitas pengguna tidak valid.');
  }

  if (!allowedRoles.includes(role)) {
    return forbidden(`Akses ditolak. Role ${role} tidak memiliki izin untuk aksi ini.`);
  }

  const email = req.headers.get(AUTH_HEADERS.email) || '';
  let name = email;
  const rawName = req.headers.get(AUTH_HEADERS.name);
  if (rawName) {
    try {
      name = decodeURIComponent(rawName);
    } catch {
      name = rawName;
    }
  }

  return { id, role, email, name: name || 'Pengguna' };
}
