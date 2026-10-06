import { PrismaClient } from '@prisma/client';
import { AccountService } from '../src/account/account.service';
import {
  APP_PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
  getEffectivePermissions,
  hasPermission,
} from '../lib/permissions';

const prisma = new PrismaClient();
const accountService = new AccountService(prisma as any);

async function runTests() {
  console.log('🚀 === MEMULAI PENGUJIAN MANAJEMEN FITUR & HAK AKSES DINAMIS ===');

  let owner = await prisma.user.findFirst({ where: { role: 'OWNER' } });
  if (!owner) throw new Error('Owner tidak ditemukan');

  // 1. Uji Owner Selalu Memiliki Seluruh Fitur
  console.log('\n--- 1. Uji Hak Akses Penuh Owner ---');
  const ownerPerms = getEffectivePermissions(owner);
  console.log('✔ Total fitur Owner:', ownerPerms.length, 'dari', APP_PERMISSIONS.length);
  if (ownerPerms.length !== APP_PERMISSIONS.length) {
    throw new Error('Owner harus memiliki seluruh izin fitur');
  }
  if (!hasPermission(owner, 'POS_VOID') || !hasPermission(owner, 'ACCOUNT_MANAGE')) {
    throw new Error('Owner harus memiliki semua fitur');
  }

  // 2. Buat Kasir Baru dengan Default Permissions
  console.log('\n--- 2. Buat Kasir dengan Template Fitur Default ---');
  const testEmail = `kasir_fitur_${Date.now()}@solitpos.com`;
  const createdKasir = await accountService.createAccount({
    name: 'Budi Kasir Custom',
    email: testEmail,
    password: 'Password123!',
    role: 'KASIR' as any,
  });

  console.log('✔ Kasir berhasil dibuat:', createdKasir.name);
  console.log('  Fitur efektif awal:', createdKasir.effectivePermissions);
  if (!hasPermission(createdKasir, 'POS_CHECKOUT')) throw new Error('Kasir default harus punya POS_CHECKOUT');
  if (hasPermission(createdKasir, 'POS_VOID')) throw new Error('Kasir default TIDAK boleh punya POS_VOID');
  if (hasPermission(createdKasir, 'FINANCE_JOURNAL')) throw new Error('Kasir default TIDAK boleh punya FINANCE_JOURNAL');

  // 3. Owner Menambah Fitur Kasir Tanpa Koding Ulang
  console.log('\n--- 3. Tambah Fitur Kustom untuk Kasir (Tanpa Koding) ---');
  // Berikan izin tambahan: INVENTORY_PURCHASE dan FINANCE_JOURNAL
  const newPermList = [
    ...createdKasir.effectivePermissions,
    'INVENTORY_PURCHASE',
    'FINANCE_JOURNAL',
  ];
  const updatedPerms = await accountService.updatePermissions(createdKasir.id, newPermList);
  console.log('✔ Respon update:', updatedPerms.message);
  console.log('  Fitur setelah diupdate:', updatedPerms.user.effectivePermissions);

  if (!hasPermission(updatedPerms.user, 'INVENTORY_PURCHASE')) {
    throw new Error('Kasir seharusnya sekarang punya INVENTORY_PURCHASE');
  }
  if (!hasPermission(updatedPerms.user, 'FINANCE_JOURNAL')) {
    throw new Error('Kasir seharusnya sekarang punya FINANCE_JOURNAL');
  }
  console.log('✔ Kasir sekarang bisa akses Input Pembelian & Jurnal Umum!');

  // 4. Owner Mengurangi Fitur Kasir (Cabut izin POS_CHECKOUT)
  console.log('\n--- 4. Kurangi Fitur Kasir (Cabut izin POS_CHECKOUT) ---');
  const reducedPermList = updatedPerms.user.effectivePermissions.filter((p: string) => p !== 'POS_CHECKOUT');
  const reducedResult = await accountService.updatePermissions(createdKasir.id, reducedPermList);
  console.log('✔ Respon update:', reducedResult.message);
  console.log('  Fitur setelah dicabut:', reducedResult.user.effectivePermissions);

  if (hasPermission(reducedResult.user, 'POS_CHECKOUT')) {
    throw new Error('Izin POS_CHECKOUT seharusnya sudah dicabut!');
  }
  console.log('✔ Izin POS_CHECKOUT berhasil dicabut!');

  // 5. Uji getAccountList Mengembalikan Fitur Terkini
  console.log('\n--- 5. Uji getAccountList Memuat Hak Akses Terkini ---');
  const list = await accountService.getAccountList();
  const foundInList = list.find((a) => a.id === createdKasir.id);
  console.log('✔ Akun dalam list memuat effectivePermissions:', foundInList?.effectivePermissions?.length, 'fitur');
  if (!foundInList?.effectivePermissions?.includes('INVENTORY_PURCHASE')) {
    throw new Error('List harus mencakup INVENTORY_PURCHASE');
  }

  // Cleanup
  await prisma.user.delete({ where: { id: createdKasir.id } });
  console.log('✔ Data uji coba berhasil dibersihkan.');

  console.log('\n🎉 SEMUA PENGUJIAN MANAJEMEN FITUR & HAK AKSES DINAMIS SUKSES 100%!');
}

runTests()
  .catch((e) => {
    console.error('❌ Error pengujian:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
