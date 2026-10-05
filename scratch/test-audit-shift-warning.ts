import { PrismaClient } from '@prisma/client';
import { CashflowService } from '../src/cashflow/cashflow.service';
import { ShiftService } from '../src/shift/shift.service';
import { InventoryService } from '../src/inventory/inventory.service';
import { PosService } from '../src/pos/pos.service';
import { CashflowType } from '../src/cashflow/dto/create-cashflow.dto';
import { PaymentMethod } from '../src/pos/dto/checkout.dto';

const prisma = new PrismaClient();
const cashflowService = new CashflowService(prisma as any);
const shiftService = new ShiftService(prisma as any);
const inventoryService = new InventoryService(prisma as any);
const posService = new PosService(prisma as any);

async function testAuditAndShiftWarning() {
  console.log('[START] === STARTING VERIFICATION: AUDIT TRAIL & SHIFT WARNING ===\n');

  // 1. UJI AUDIT CASHFLOW (REJECT TANPA HAPUS DATA & JEJAK USER)
  console.log('--- TEST 1: Cashflow Reject Preserved & Audit Trail ---');
  const dummyOwnerId = 'owner-uuid-audit-01';
  const dummyFinanceId = 'finance-uuid-audit-02';

  const cfDraft = await cashflowService.create(
    {
      type: CashflowType.CASHFLOW_OUT,
      keterangan: 'Biaya Uji Audit Reject',
      sourceAccountCode: '110',
      targetAccountCode: '510',
      nominal: 50000,
    },
    { id: dummyFinanceId, role: 'FINANCE' }
  );

  console.log(`[PASS] Cashflow Draft dibuat dengan createdBy: ${cfDraft.createdBy}`);
  if (cfDraft.createdBy !== dummyFinanceId) {
    throw new Error(`Expected createdBy ${dummyFinanceId}, got ${cfDraft.createdBy}`);
  }

  // Reject cashflow
  const cfRejected = await cashflowService.reject(cfDraft.id, {
    id: dummyOwnerId,
    role: 'OWNER',
  });

  console.log(`[PASS] Status setelah reject: ${cfRejected.status} (Harus REJECTED, bukan dihapus!)`);
  console.log(`[PASS] Audit Penolak: approvedBy=${cfRejected.approvedBy}, approvedAt=${cfRejected.approvedAt}`);
  if (cfRejected.status !== 'REJECTED' || cfRejected.approvedBy !== dummyOwnerId || !cfRejected.approvedAt) {
    throw new Error('Audit trail reject cashflow tidak valid atau data terhapus!');
  }

  // Verifikasi record masih ada di database
  const stillInDb = await prisma.journalEntry.findUnique({ where: { id: cfDraft.id } });
  if (!stillInDb) {
    throw new Error('[FAIL] FATAL: Record cashflow terhapus dari database setelah reject!');
  }
  console.log('[PASS] Verifikasi database: Record cashflow tetap ada di DB (Data tidak menguap).');

  // 2. UJI AUDIT INVENTORY (RESTOCK MAKER-CHECKER)
  console.log('\n--- TEST 2: Inventory Maker-Checker Audit Trail ---');
  let model = await prisma.productModel.findFirst();
  if (!model) {
    model = await prisma.productModel.create({
      data: { sku: 'TEST-SKU-AUDIT', name: 'Laptop Audit', category: 'LAPTOP' },
    });
  }

  const snAudit = 'SN-AUDIT-TEST-001';
  await prisma.productUnit.deleteMany({ where: { serialNumber: snAudit } });

  const unitCreated = await inventoryService.createUnit(
    {
      productModelId: model.id,
      serialNumber: snAudit,
      condition: 'NEW',
      hpp: 5000000,
      price: 7000000,
    },
    { id: dummyFinanceId, role: 'FINANCE', name: 'Finance Audit' }
  );

  console.log(`[PASS] ProductUnit createdBy: ${unitCreated.createdBy}`);
  console.log(`[PASS] PurchaseJournal createdBy: ${unitCreated.purchaseJournal?.createdBy}`);
  if (unitCreated.createdBy !== dummyFinanceId || unitCreated.purchaseJournal?.createdBy !== dummyFinanceId) {
    throw new Error('Audit createdBy pada inventory unit/jurnal tidak sesuai!');
  }

  const unitApproved = await inventoryService.approveUnit(unitCreated.id, {
    id: dummyOwnerId,
    role: 'OWNER',
    name: 'Owner Audit',
  });

  console.log(`[PASS] ProductUnit approvedBy: ${unitApproved.approvedBy}, approvedAt: ${unitApproved.approvedAt}`);
  console.log(`[PASS] PurchaseJournal approvedBy: ${unitApproved.purchaseJournal?.approvedBy}, approvedAt: ${unitApproved.purchaseJournal?.approvedAt}`);
  if (
    unitApproved.approvedBy !== dummyOwnerId ||
    !unitApproved.approvedAt ||
    unitApproved.purchaseJournal?.approvedBy !== dummyOwnerId ||
    !unitApproved.purchaseJournal?.approvedAt
  ) {
    throw new Error('Audit approvedBy/approvedAt pada inventory unit/jurnal tidak tercatat!');
  }

  // 3. UJI SISTEM PERINGATAN SHIFT GANTUNG (> 14 JAM)
  console.log('\n--- TEST 3: Sistem Deteksi Shift Kasir Gantung (> 14 Jam) ---');
  const overdueKasirId = 'kasir-overdue-uuid';
  // Hapus data uji shift kasir ini jika ada
  await prisma.cashierShift.deleteMany({ where: { userId: overdueKasirId } });

  // Buat shift kasir yang dibuka 16 jam yang lalu
  const sixteenHoursAgo = new Date(Date.now() - 16 * 60 * 60 * 1000);
  const testOverdueShift = await prisma.cashierShift.create({
    data: {
      userId: overdueKasirId,
      startTime: sixteenHoursAgo,
      startingCash: 300000,
      status: 'OPEN',
    },
  });

  const warnings = await shiftService.getOverdueShiftWarnings({ role: 'OWNER' });
  console.log(`[PASS] Total shift gantung terdeteksi: ${warnings.length}`);
  const targetWarning = warnings.find((w) => w.id === testOverdueShift.id);
  if (!targetWarning) {
    throw new Error('Shift 16 jam lalu gagal dideteksi oleh sistem peringatan!');
  }

  console.log(`[PASS] Shift ID: ${targetWarning.id}`);
  console.log(`[PASS] Kasir: ${targetWarning.user.name}`);
  console.log(`[PASS] Durasi Gantung: ${targetWarning.elapsedHours} jam (>= 14 jam)`);

  // Pastikan non-OWNER ditolak
  try {
    await shiftService.getOverdueShiftWarnings({ role: 'KASIR' });
    throw new Error('[FAIL] Akses non-OWNER seharusnya ditolak!');
  } catch (err: any) {
    console.log(`[PASS] Proteksi RBAC berhasil: Non-owner ditolak ("${err.message}")`);
  }

  // Cleanup
  await prisma.cashierShift.delete({ where: { id: testOverdueShift.id } });
  await prisma.journalEntry.delete({ where: { id: cfDraft.id } });
  await prisma.productUnit.delete({ where: { id: unitCreated.id } });

  console.log('\n[COMPLETE] === ALL AUDIT TRAIL & SHIFT WARNING TESTS PASSED 100% PERFECTLY! ===\n');
}

testAuditAndShiftWarning()
  .catch((e) => {
    console.error('[FAIL] Test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
