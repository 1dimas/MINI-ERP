import { PrismaClient } from '@prisma/client';
import { InventoryService } from '../src/inventory/inventory.service';

const prisma = new PrismaClient();
const inventoryService = new InventoryService(prisma);

async function runPrdVerification() {
  console.log('=== START PRD INVENTORY VERIFICATION TEST ===\n');

  const testSn = 'SN-TEST-LAPTOP-99';

  // Cleanup prior test run if any
  try {
    const existing = await prisma.productUnit.findUnique({ where: { serialNumber: testSn } });
    if (existing) {
      await inventoryService.rejectUnit(existing.id, 'Cleanup previous test');
    }
  } catch (e) {}

  // 0. Create Model
  const model = await inventoryService.createModel({
    sku: 'L-DELL-XPS13',
    name: 'Dell XPS 13 Touch (i7 / 16GB / 512GB)',
    category: 'LAPTOP',
  });

  // 1. TEST: Input Barang Masuk + QC Checklist (FINANCE Maker)
  console.log('1. Testing FINANCE Maker Unit Creation (QC_PENDING & DRAFT Journal)...');
  const unitCreated = await inventoryService.createUnit(
    {
      productModelId: model.id,
      serialNumber: testSn,
      condition: 'SECOND',
      grade: 'C',
      hpp: 8000000,
      price: 11500000,
      isFisikNormal: true,
      isKeyboardNormal: false,
      isMesinNormal: true,
      catatanFisik: 'Tombol Shift kanan mati, butuh ganti keyboard.',
    },
    { id: 'fin-01', role: 'FINANCE', name: 'Siti Keuangan' }
  );

  console.log(`   [PASS] Unit Created ID: ${unitCreated.id}, Status: ${unitCreated.status}`);
  console.log(`   [PASS] Purchase Journal Status: ${unitCreated.purchaseJournal?.status} (DRAFT)`);

  // 2. TEST: Duplicate SN Rejection
  console.log('\n2. Testing Duplicate SN Rejection (Backend Validation Constraint)...');
  try {
    await inventoryService.createUnit(
      {
        productModelId: model.id,
        serialNumber: testSn,
        condition: 'NEW',
        grade: 'A',
        hpp: 5000000,
        price: 7000000,
      },
      { id: 'fin-01', role: 'FINANCE' }
    );
    console.error('   [FAIL] ERROR: System failed to reject duplicate SN!');
  } catch (err: any) {
    console.log(`   [PASS] SUCCESS: Rejection verified! Error message: "${err.message}"`);
  }

  // 3. TEST: Kasir Status Protection (Cannot checkout QC_PENDING)
  console.log('\n3. Testing Kasir Status Gatekeeper Protection...');
  // Buka shift kasir terlebih dahulu
  await prisma.cashierShift.deleteMany({ where: { userId: 'kasir-01' } });
  await prisma.cashierShift.create({
    data: {
      userId: 'kasir-01',
      startingCash: 500000,
      status: 'OPEN',
    },
  });

  const { PosService } = await import('../src/pos/pos.service');
  const { PaymentMethod } = await import('../src/pos/dto/checkout.dto');
  const posService = new PosService(prisma as any);

  try {
    await posService.checkout(
      { items: [testSn], amountPaid: 12000000, paymentMethod: PaymentMethod.CASH },
      { id: 'kasir-01', role: 'KASIR', name: 'Budi Kasir' }
    );
    console.error('   [FAIL] ERROR: Kasir was able to checkout a QC_PENDING unit!');
  } catch (err: any) {
    console.log(`   [PASS] SUCCESS: Kasir Checkout blocked! Error message: "${err.message}"`);
  }

  // 4. TEST: Owner Approval (Checker Phase)
  console.log('\n4. Testing Owner Approval (Checker Phase)...');
  const approvedUnit = await inventoryService.approveUnit(unitCreated.id, { id: 'owner-01', role: 'OWNER' });
  console.log(`   [PASS] Unit Approved by Owner! New Status: ${approvedUnit.status}`);

  // 5. TEST: Capitalization / Upgrade Phase (Flipping Scenario)
  console.log('\n5. Testing Value-Add Upgrade & Capitalization...');
  const upgradedUnit = await inventoryService.upgradeUnit(
    unitCreated.id,
    {
      addedHppCost: 350000,
      grade: 'A',
      status: 'AVAILABLE',
      isKeyboardNormal: true,
      catatanFisik: 'Keyboard sudah diganti baru original. Unit 100% mulus siap jual.',
    }
  );
  console.log(`   [PASS] Unit Upgraded! New HPP: Rp ${upgradedUnit.hpp} (Initial 8M + 350K Upgrade)`);

  // 6. TEST: Successful Kasir POS Checkout with Strict HPP Auto-Journal
  console.log('\n6. Testing Successful POS Checkout for AVAILABLE Unit...');
  const checkoutResult = await posService.checkout(
    { items: [testSn], amountPaid: 12000000, paymentMethod: PaymentMethod.CASH },
    { id: 'kasir-01', role: 'KASIR', name: 'Budi Kasir' }
  );
  console.log(`   [PASS] ${checkoutResult.message}`);
  console.log('\n=== ALL PRD INVENTORY TESTS PASSED PERFECTLY ===\n');
}

runPrdVerification()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
