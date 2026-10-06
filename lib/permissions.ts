export interface PermissionDefinition {
  key: string;
  name: string;
  category: 'POS' | 'INVENTORY' | 'FINANCE' | 'SHIFT' | 'SYSTEM';
  categoryLabel: string;
  description: string;
}

export const APP_PERMISSIONS: PermissionDefinition[] = [
  // 1. TERMINAL KASIR (POS)
  {
    key: 'POS_CHECKOUT',
    name: 'Transaksi Kasir (Scan & Jual)',
    category: 'POS',
    categoryLabel: 'Terminal Kasir (POS)',
    description: 'Melakukan pemindaian barcode/SN, kalkulasi total, dan memproses pembayaran nota.',
  },
  {
    key: 'POS_HISTORY',
    name: 'Lihat Riwayat Transaksi',
    category: 'POS',
    categoryLabel: 'Terminal Kasir (POS)',
    description: 'Membuka daftar nota penjualan lama dan mencetak ulang struk pembayaran.',
  },
  {
    key: 'POS_VOID',
    name: 'Batalkan Nota (VOID Transaksi)',
    category: 'POS',
    categoryLabel: 'Terminal Kasir (POS)',
    description: 'Membatalkan nota transaksi penjualan sukses dan mengembalikan stok unit ke toko.',
  },

  // 2. INVENTARIS & BARANG
  {
    key: 'INVENTORY_VIEW',
    name: 'Cek Ketersediaan Stok',
    category: 'INVENTORY',
    categoryLabel: 'Inventaris & Stok',
    description: 'Melihat ketersediaan stok laptop, status unit ready, dan unit pending QC.',
  },
  {
    key: 'INVENTORY_MANAGE',
    name: 'Kelola Katalog & Stok Unit',
    category: 'INVENTORY',
    categoryLabel: 'Inventaris & Stok',
    description: 'Menambah tipe laptop baru, mengedit harga jual/HPP, dan merawat data unit.',
  },
  {
    key: 'INVENTORY_QC',
    name: 'Approval & Audit QC Fisik',
    category: 'INVENTORY',
    categoryLabel: 'Inventaris & Stok',
    description: 'Melakukan uji kelayakan fisik/mesin laptop bekas dan menyetujui unit siap jual.',
  },
  {
    key: 'INVENTORY_PURCHASE',
    name: 'Input Pembelian / Kulakan',
    category: 'INVENTORY',
    categoryLabel: 'Inventaris & Stok',
    description: 'Mencatat faktur pembelian stok laptop baru atau second dari supplier/tukar tambah.',
  },

  // 3. KEUANGAN & AKUNTANSI
  {
    key: 'FINANCE_JOURNAL',
    name: 'Jurnal Umum & Koreksi Audit',
    category: 'FINANCE',
    categoryLabel: 'Keuangan & Akuntansi',
    description: 'Melihat ayat jurnal debet-kredit akuntansi dan melakukan audit/penandaan koreksi.',
  },
  {
    key: 'FINANCE_LEDGER',
    name: 'Buku Besar (General Ledger)',
    category: 'FINANCE',
    categoryLabel: 'Keuangan & Akuntansi',
    description: 'Melihat riwayat mutasi dan saldo berjalan per akun (Kas, Bank, Beban, Modal).',
  },
  {
    key: 'FINANCE_REPORT',
    name: 'Neraca Saldo & Laporan Keuangan',
    category: 'FINANCE',
    categoryLabel: 'Keuangan & Akuntansi',
    description: 'Memantau keseimbangan neraca, posisi aset toko, kewajiban, dan laba rugi.',
  },
  {
    key: 'FINANCE_CASHFLOW',
    name: 'Arus Kas Masuk & Keluar',
    category: 'FINANCE',
    categoryLabel: 'Keuangan & Akuntansi',
    description: 'Mencatat pengeluaran operasional (listrik, gaji) dan penerimaan kas toko.',
  },
  {
    key: 'FINANCE_CASHFLOW_APPROVE',
    name: 'Persetujuan (Approval) Kas',
    category: 'FINANCE',
    categoryLabel: 'Keuangan & Akuntansi',
    description: 'Menyetujui pengeluaran uang kas toko sebelum dibukukan ke jurnal umum.',
  },

  // 4. KASIR & SHIFT
  {
    key: 'SHIFT_MANAGE',
    name: 'Buka & Tutup Shift Kasir',
    category: 'SHIFT',
    categoryLabel: 'Shift & Operasional',
    description: 'Mengisi modal awal kas laci toko dan menghitung uang fisik pada penutupan shift.',
  },

  // 5. MANAJEMEN SDM & SISTEM
  {
    key: 'ACCOUNT_MANAGE',
    name: 'Manajemen Akun, SDM & Fitur',
    category: 'SYSTEM',
    categoryLabel: 'Manajemen Akun & SDM',
    description: 'Menambah karyawan, suspend akun, menerbitkan SP, reset 2FA, dan mengatur hak akses fitur.',
  },
];

export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  OWNER: APP_PERMISSIONS.map((p) => p.key),
  FINANCE: [
    'INVENTORY_VIEW',
    'INVENTORY_MANAGE',
    'INVENTORY_QC',
    'INVENTORY_PURCHASE',
    'FINANCE_JOURNAL',
    'FINANCE_LEDGER',
    'FINANCE_REPORT',
    'FINANCE_CASHFLOW',
  ],
  KASIR: [
    'POS_CHECKOUT',
    'POS_HISTORY',
    'INVENTORY_VIEW',
    'SHIFT_MANAGE',
  ],
};

/**
 * Mengembalikan daftar izin efektif user.
 * - OWNER selalu memiliki SEMUA izin fitur.
 * - Jika permissions user di database kosong/null, gunakan template default role.
 * - Jika permissions user dikonfigurasi kustom oleh Owner, gunakan list kustom tersebut.
 */
export function getEffectivePermissions(user: { role: string; permissions?: string[] | null }): string[] {
  if (user.role === 'OWNER') {
    return APP_PERMISSIONS.map((p) => p.key);
  }

  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions;
  }

  return ROLE_DEFAULT_PERMISSIONS[user.role] || [];
}

/**
 * Cek apakah user berhak mengakses fitur tertentu
 */
export function hasPermission(
  user: { role: string; permissions?: string[] | null } | null | undefined,
  requiredPermission: string,
): boolean {
  if (!user) return false;
  if (user.role === 'OWNER') return true;

  const permissions = getEffectivePermissions(user);
  return permissions.includes(requiredPermission);
}
