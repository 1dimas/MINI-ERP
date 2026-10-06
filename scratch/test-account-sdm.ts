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
  console.log('🚀 === MEMULAI PENGUJIAN MODUL MANAJEMEN AKUN & SDM ===');

  // Pastikan owner ada
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
  console.log('✔ 1. Owner terverifikasi:', owner.name, `(${owner.email})`);

  // 2. Test Create Karyawan Baru
  const testKasirEmail = `kasir_test_${Date.now()}@solitpos.com`;
  const createdKasir = await accountService.createAccount({
    name: 'Kasir Uji Coba',
    email: testKasirEmail,
    password: 'Password123!',
    role: 'KASIR' as any,
  });
  console.log('✔ 2. Berhasil buat kasir baru:', createdKasir.name, createdKasir.email, 'Status:', createdKasir.status);
  if (createdKasir.status !== 'ACTIVE') throw new Error('Status awal kasir baru harus ACTIVE');

  // 3. Test Terbitkan SP 1, SP 2, SP 3
  console.log('\n--- Menguji Penerbitan SP 1, 2, 3 ---');
  const sp1 = await accountService.issueWarningLetter(createdKasir.id, owner.id, {
    reason: 'SP 1: Terlambat masuk shift kasir 30 menit.',
  });
  console.log('✔ SP 1 diterbitkan. Total SP:', sp1.totalWarnings, 'Critical:', sp1.isCritical);

  const sp2 = await accountService.issueWarningLetter(createdKasir.id, owner.id, {
    reason: 'SP 2: Selisih kas fisik Rp 50.000 pada tutup shift.',
  });
  console.log('✔ SP 2 diterbitkan. Total SP:', sp2.totalWarnings, 'Critical:', sp2.isCritical);

  const sp3 = await accountService.issueWarningLetter(createdKasir.id, owner.id, {
    reason: 'SP 3: Selisih kas berulang dan tidak melapor.',
  });
  console.log('✔ SP 3 diterbitkan. Total SP:', sp3.totalWarnings, 'Critical:', sp3.isCritical);
  console.log('  Rekomendasi sistem:', sp3.recommendation);
  if (!sp3.isCritical || !sp3.recommendation?.includes('Banned')) {
    throw new Error('SP 3 harus memicu rekomendasi Banned Akun!');
  }

  // 4. Test List Accounts with Warning Count
  const accountList = await accountService.getAccountList();
  const foundKasirInList = accountList.find((a) => a.id === createdKasir.id);
  console.log('✔ 4. Akun dalam list memiliki rekap SP:', foundKasirInList?.warningCount, 'Histori length:', foundKasirInList?.receivedWarnings.length);
  if (foundKasirInList?.warningCount !== 3) throw new Error('Warning count di list harus 3');

  // 5. Test Ban Karyawan
  console.log('\n--- Menguji Pembekuan (BANNED) Akun ---');
  const banResult = await accountService.banAccount(createdKasir.id, owner.id);
  console.log('✔ 5. Akun dibekukan:', banResult.message, 'Status:', banResult.user.status);
  if (banResult.user.status !== 'BANNED') throw new Error('Status harus BANNED');

  // 6. Test Login Kasir yang di-Banned harus DITOLAK
  console.log('\n--- Menguji Penolakan Login Kasir BANNED ---');
  let loginBlocked = false;
  try {
    await authService.login({
      email: testKasirEmail,
      password: 'Password123!',
    });
  } catch (err: any) {
    loginBlocked = true;
    console.log('✔ 6. Berhasil ditolak saat login:', err.message);
  }
  if (!loginBlocked) throw new Error('Kasir BANNED tidak boleh bisa login!');

  // 7. Test Aktifkan Kembali Akun
  console.log('\n--- Menguji Aktivasi Kembali Akun ---');
  const activateResult = await accountService.activateAccount(createdKasir.id);
  console.log('✔ 7. Akun diaktifkan kembali:', activateResult.message, 'Status:', activateResult.user.status);
  if (activateResult.user.status !== 'ACTIVE') throw new Error('Status harus ACTIVE');

  // Login sekarang harus berhasil
  const loginSuccess = await authService.login({
    email: testKasirEmail,
    password: 'Password123!',
  });
  console.log('✔ Login berhasil setelah diaktifkan kembali. Access token diperoleh.');

  // 8. Test Reset 2FA Darurat
  console.log('\n--- Menguji Reset 2FA Darurat ---');
  // Pasang 2FA dummy
  await prisma.user.update({
    where: { id: createdKasir.id },
    data: { isTwoFactorEnabled: true, twoFactorSecret: 'DUMMYSECRET123' },
  });
  const resetResult = await accountService.reset2Fa(createdKasir.id);
  console.log('✔ 8. Reset 2FA berhasil:', resetResult.message, '2FA Enabled:', resetResult.user.isTwoFactorEnabled);
  if (resetResult.user.isTwoFactorEnabled !== false) throw new Error('isTwoFactorEnabled harus false');

  // 9. Test Self-Service Update Password & Email
  console.log('\n--- Menguji Self-Service Ganti Password & Email ---');
  // Password lama salah -> Harus throw
  let oldPwRejected = false;
  try {
    await accountService.updateSelf(createdKasir.id, {
      oldPassword: 'WrongPassword!',
      newPassword: 'NewPassword2026!',
    });
  } catch (err: any) {
    oldPwRejected = true;
    console.log('✔ Password lama salah berhasil ditolak:', err.message);
  }
  if (!oldPwRejected) throw new Error('Password lama yang salah harus ditolak');

  // Password lama benar -> Berhasil update
  const updatedSelf = await accountService.updateSelf(createdKasir.id, {
    oldPassword: 'Password123!',
    newPassword: 'NewPassword2026!',
    newEmail: `new_${testKasirEmail}`,
  });
  console.log('✔ 9. Update profil mandiri sukses:', updatedSelf.message, 'Email baru:', updatedSelf.user.email);

  // Verifikasi login dengan password baru
  const loginNewPw = await authService.login({
    email: `new_${testKasirEmail}`,
    password: 'NewPassword2026!',
  });
  console.log('✔ Login dengan kredensial baru sukses.');

  // Cleanup unit test data
  await prisma.warningLetter.deleteMany({ where: { userId: createdKasir.id } });
  await prisma.user.delete({ where: { id: createdKasir.id } });
  console.log('✔ Data uji coba berhasil dibersihkan.');

  console.log('\n🎉 SEMUA PENGUJIAN MODUL MANAJEMEN AKUN & SDM SUKSES 100%!');
}

runTests()
  .catch((e) => {
    console.error('❌ Error pengujian:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
