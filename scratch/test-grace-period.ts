import { PrismaClient } from '@prisma/client';
import { AccountService } from '../src/account/account.service';
import { AuthService } from '../src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const accountService = new AccountService(prisma as any);
const jwtService = new JwtService({ secret: process.env.JWT_SECRET || 'secret' });
const authService = new AuthService(prisma as any, jwtService);

async function runTests() {
  console.log('🚀 === MEMULAI PENGUJIAN SISTEM SUSPEND & GRACE PERIOD 3 MINGGU (21 HARI) ===');

  let owner = await prisma.user.findFirst({ where: { role: 'OWNER' } });
  if (!owner) {
    const pw = await bcrypt.hash('AdminSolit2026!', 10);
    owner = await prisma.user.create({
      data: {
        name: 'Dimas Owner Test',
        email: 'dimas_test@solitpos.com',
        password: pw,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
  }
  console.log('✔ 1. Owner terverifikasi:', owner.name);

  // 2. Buat akun kasir uji coba
  const testEmail = `kasir_gp_${Date.now()}@solitpos.com`;
  const kasir = await accountService.createAccount({
    name: 'Kasir Grace Period',
    email: testEmail,
    password: 'Password123!',
    role: 'KASIR' as any,
  });
  console.log('✔ 2. Kasir baru dibuat:', kasir.name, 'Status:', kasir.status);

  // 3. Suspend akun
  console.log('\n--- Menguji Penonaktifan (SUSPEND) Akun ---');
  const suspendResult = await accountService.suspendAccount(kasir.id, owner.id);
  console.log('✔ 3. Suspend berhasil:', suspendResult.message, 'Status:', suspendResult.user.status);
  if (suspendResult.user.status !== 'SUSPENDED') throw new Error('Status harus SUSPENDED');

  // 4. Verifikasi Login Ditolak saat SUSPENDED
  let loginBlocked = false;
  try {
    await authService.login({
      email: testEmail,
      password: 'Password123!',
    });
  } catch (err: any) {
    loginBlocked = true;
    console.log('✔ 4. Login akun SUSPENDED ditolak:', err.message);
  }
  if (!loginBlocked) throw new Error('Akun SUSPENDED tidak boleh bisa login!');

  // 5. Restore akun dalam masa tenggang (0 hari sejak suspend)
  console.log('\n--- Menguji Pemulihan (RESTORE) Dalam Masa Tenggang (≤ 21 Hari) ---');
  const restoreResult = await accountService.restoreAccount(kasir.id);
  console.log('✔ 5. Restore berhasil:', restoreResult.message, 'Status:', restoreResult.user.status);
  if (restoreResult.user.status !== 'ACTIVE') throw new Error('Status harus ACTIVE setelah restore');

  // Login sekarang harus sukses
  const loginRestored = await authService.login({
    email: testEmail,
    password: 'Password123!',
  });
  console.log('✔ Login berhasil kembali setelah di-restore.');

  // 6. Uji Kasus Melewati Batas 3 Minggu (> 21 Hari)
  console.log('\n--- Menguji Masa Tenggang Kedaluwarsa (> 21 Hari / Arsip Mati) ---');
  // Suspend kembali
  await accountService.suspendAccount(kasir.id, owner.id);

  // Manipulasi suspendedAt menjadi 25 hari yang lalu
  const twentyFiveDaysAgo = new Date(Date.now() - 25 * 24 * 60 * 60 * 1000);
  await prisma.user.update({
    where: { id: kasir.id },
    data: { suspendedAt: twentyFiveDaysAgo },
  });
  console.log('Simulasi: suspendedAt diatur ke 25 hari yang lalu.');

  // Coba restore -> Harus DITOLAK karena > 21 hari dan berubah jadi ARCHIVED
  let restoreExpiredBlocked = false;
  try {
    await accountService.restoreAccount(kasir.id);
  } catch (err: any) {
    restoreExpiredBlocked = true;
    console.log('✔ 6. Restore > 21 hari berhasil ditolak:', err.message);
  }
  if (!restoreExpiredBlocked) throw new Error('Restore > 21 hari harus ditolak!');

  // Verifikasi status terkini di DB menjadi ARCHIVED
  const archivedUser = await prisma.user.findUnique({ where: { id: kasir.id } });
  console.log('✔ 7. Status akun di DB otomatis terkunci menjadi:', archivedUser?.status);
  if (archivedUser?.status !== 'ARCHIVED') throw new Error('Status harus ARCHIVED setelah lewat 21 hari');

  // 8. Verifikasi Login Ditolak untuk ARCHIVED
  let loginArchivedBlocked = false;
  try {
    await authService.login({
      email: testEmail,
      password: 'Password123!',
    });
  } catch (err: any) {
    loginArchivedBlocked = true;
    console.log('✔ 8. Login akun ARCHIVED ditolak:', err.message);
  }
  if (!loginArchivedBlocked) throw new Error('Akun ARCHIVED tidak boleh bisa login!');

  // 9. Uji Endpoint Riwayat Mantan Karyawan
  console.log('\n--- Menguji GET /account/history ---');
  const history = await accountService.getHistoryAccounts();
  const foundHistory = history.find((h) => h.id === kasir.id);
  console.log('✔ 9. Akun ditemukan di daftar riwayat mantan karyawan:');
  console.log('   Status:', foundHistory?.status);
  console.log('   Hari Suspended:', foundHistory?.daysSuspended);
  console.log('   Sisa Hari Grace Period:', foundHistory?.remainingDays);
  console.log('   Bisa di-restore:', foundHistory?.canRestore);

  if (foundHistory?.canRestore !== false) {
    throw new Error('Akun arsip mati tidak boleh bisa di-restore');
  }

  // Cleanup
  await prisma.user.delete({ where: { id: kasir.id } });
  console.log('✔ Data uji coba berhasil dibersihkan.');

  console.log('\n🎉 SEMUA PENGUJIAN SISTEM SUSPEND & GRACE PERIOD 3 MINGGU SUKSES 100%!');
}

runTests()
  .catch((e) => {
    console.error('❌ Error pengujian:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
