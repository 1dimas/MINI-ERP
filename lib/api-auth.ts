import { NextResponse } from 'next/server';
import { prisma } from './prisma';
import { hasPermission } from './permissions';

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
 */
export function requireAuth(
  req: Request,
  allowedRoles: AppRole[] = ALL_ROLES,
): AuthUser | NextResponse {
  const id = req.headers.get(AUTH_HEADERS.id);
  const role = (req.headers.get(AUTH_HEADERS.role) || '').toUpperCase() as AppRole;
  const status = req.headers.get(AUTH_HEADERS.status) || 'ACTIVE';

  if (status !== 'ACTIVE') {
    return NextResponse.json(
      { message: `Akun Anda tidak aktif (${status}). Akses ditolak.` },
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

/**
 * Validasi hak akses fitur dinamis (Granular Permission).
 * Bebas koding ulang: cukup cek izin fitur yang diperlukan.
 */
export async function requirePermission(
  req: Request,
  requiredPermission: string,
): Promise<AuthUser | NextResponse> {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  if (auth.role === 'OWNER') return auth;

  const user = await prisma.user.findUnique({
    where: { id: auth.id },
    select: { role: true, permissions: true, status: true },
  });

  if (!user || user.status !== 'ACTIVE' || !hasPermission(user, requiredPermission)) {
    return NextResponse.json(
      { message: `Akses ditolak. Anda tidak memiliki izin untuk fitur: ${requiredPermission}` },
      { status: 403 }
    );
  }

  return auth;
}
