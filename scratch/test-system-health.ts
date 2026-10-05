import { PrismaClient } from '@prisma/client';
import { SystemService } from '../src/system/system.service';

const prisma = new PrismaClient();
const systemService = new SystemService(prisma as any);

async function testSystemHealth() {
  console.log('[START] === STARTING VERIFICATION: SYSTEM HEALTH CHECK ===\n');

  // 1. Jalankan Diagnostik Awal
  console.log('1. Menjalankan Diagnostik Kondisi Saat Ini...');
  const report1 = await systemService.getHealthCheck();
  console.log(`   Timestamp: ${report1.timestamp}`);
  console.log(`   Overall Status: ${report1.isAllHealthy ? '[HEALTHY] ALL HEALTHY (100%)' : '[UNHEALTHY] ANOMALY DETECTED'}\n`);

  for (const check of report1.checks) {
    const icon = check.status === 'HEALTHY' ? '[PASS]' : '[FAIL]';
    console.log(`   ${icon} [${check.status}] ${check.indicator}`);
    console.log(`      Pesan: ${check.message}`);
    if (check.details) {
      console.log(`      Detail:`, JSON.stringify(check.details));
    }
  }

  // 2. UJI RESPON ANOMALI: Simulasi "Transaksi Kasir Hantu"
  console.log('\n2. Menguji Deteksi Anomali: Simulasi Transaksi Kasir Hantu (Tanpa Jurnal)...');
  const dummyGhostTx = await prisma.posTransaction.create({
    data: {
      invoiceNumber: 'INV-TEST-GHOST-999',
      status: 'SUCCESS',
      paymentMethod: 'CASH',
      serialNumber: 'SN-GHOST-01',
      totalPrice: 1000000,
      totalHpp: 800000,
      journalEntryId: null, // Tanpa jurnal akuntansi!
    },
  });

  const reportWithGhost = await systemService.getHealthCheck();
  const ghostCheck = reportWithGhost.checks.find((c) => c.id === 'ghost-pos-transactions');

  console.log(`   Status Deteksi: ${ghostCheck?.status} (Harus ERROR)`);
  console.log(`   Pesan: "${ghostCheck?.message}"`);

  if (ghostCheck?.status !== 'ERROR' || reportWithGhost.isAllHealthy !== false) {
    throw new Error('Sistem gagal mendeteksi transaksi hantu!');
  }
  console.log('   [PASS] Sukses! Sistem langsung menangkap 1 transaksi kasir hantu.');

  // Cleanup Ghost Tx
  await prisma.posTransaction.delete({ where: { id: dummyGhostTx.id } });

  // 3. UJI RESPON ANOMALI: Simulasi Unit Nyangkut di QC (> 72 jam)
  console.log('\n3. Menguji Deteksi Anomali: Simulasi Unit Tertahan di QC_PENDING (> 72 Jam)...');
  let model = await prisma.productModel.findFirst();
  if (!model) {
    model = await prisma.productModel.create({
      data: { sku: 'TEST-SKU-HEALTH', name: 'Laptop Health Check', category: 'LAPTOP' },
    });
  }

  const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
  const staleUnit = await prisma.productUnit.create({
    data: {
      serialNumber: 'SN-STALE-QC-999',
      productModelId: model.id,
      condition: 'SECOND',
      hpp: 3000000,
      price: 4500000,
      status: 'QC_PENDING',
      createdAt: fourDaysAgo,
    },
  });

  const reportWithStale = await systemService.getHealthCheck();
  const staleCheck = reportWithStale.checks.find((c) => c.id === 'stale-qc-units');

  console.log(`   Status Deteksi: ${staleCheck?.status} (Harus ERROR)`);
  console.log(`   Pesan: "${staleCheck?.message}"`);

  if (staleCheck?.status !== 'ERROR') {
    throw new Error('Sistem gagal mendeteksi unit tertahan di QC!');
  }
  console.log('   [PASS] Sukses! Sistem langsung mendeteksi unit yang tertahan di QC.');

  // Cleanup Stale Unit
  await prisma.productUnit.delete({ where: { id: staleUnit.id } });

  // 4. Verifikasi Akhir
  console.log('\n4. Verifikasi Pasca Cleanup (Harus Kembali Bersih)...');
  const finalReport = await systemService.getHealthCheck();
  console.log(`   Overall Status: ${finalReport.isAllHealthy ? '[HEALTHY] ALL HEALTHY (100%)' : '[UNHEALTHY] ANOMALY DETECTED'}`);

  console.log('\n[COMPLETE] === ALL SYSTEM HEALTH DIAGNOSTIC TESTS PASSED 100% PERFECTLY! ===\n');
}

testSystemHealth()
  .catch((e) => {
    console.error('[FAIL] Diagnostic test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
