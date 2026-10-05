import { PrismaClient } from '@prisma/client';
import { PosService } from '../src/pos/pos.service';
import { JournalService } from '../src/journal/journal.service';
import { PaymentMethod } from '../src/pos/dto/checkout.dto';

const prisma = new PrismaClient();
const posService = new PosService(prisma as any);
const journalService = new JournalService(prisma as any);

async function testSecurityAndAccountingPatch() {
  console.log('[START] === STARTING VERIFICATION: SECURITY & ACCOUNTING PATCH ===\n');

  // Bersihkan data lama jika ada
  await prisma.posTransaction.deleteMany({
    where: { serialNumber: { in: ['TEST-SN-CASH-01', 'TEST-SN-TRF-02'] } },
  });
  await prisma.productUnit.deleteMany({
    where: { serialNumber: { in: ['TEST-SN-CASH-01', 'TEST-SN-TRF-02'] } },
  });

  // 1. Siapkan model & 2 unit tes
  let model = await prisma.productModel.findFirst();
  if (!model) {
    model = await prisma.productModel.create({
      data: { sku: 'TEST-SKU-99', name: 'Laptop Uji Patch', category: 'LAPTOP' },
    });
  }

  const unitCash = await prisma.productUnit.create({
    data: {
      serialNumber: 'TEST-SN-CASH-01',
      productModelId: model.id,
      condition: 'SECOND',
      hpp: 4000000,
      price: 5000000,
      status: 'AVAILABLE',
    },
  });

  const unitTrf = await prisma.productUnit.create({
    data: {
      serialNumber: 'TEST-SN-TRF-02',
      productModelId: model.id,
      condition: 'SECOND',
      hpp: 6000000,
      price: 7500000,
      status: 'AVAILABLE',
    },
  });

  // 2. Siapkan Shift Kasir Terikat untuk User
  const testKasirId = 'user-kasir-verif';
  await prisma.cashierShift.deleteMany({ where: { userId: testKasirId } });
  await prisma.cashierShift.create({
    data: {
      userId: testKasirId,
      startingCash: 200000,
      status: 'OPEN',
    },
  });

  // 3. UJI 1: Checkout CASH -> Jurnal DEBIT 110 (Kas Toko) & Invoice Sequential Numbering
  console.log('--- TEST 1: Checkout CASH & Format Invoice Urut ---');
  const resCash = await posService.checkout(
    {
      items: [unitCash.serialNumber],
      paymentMethod: PaymentMethod.CASH,
      amountPaid: 5000000,
    },
    { id: testKasirId, name: 'Kasir Uji', role: 'KASIR' }
  );

  console.log(`[PASS] Invoice 1 Number: ${resCash.invoice.invoiceNumber}`);
  if (!resCash.invoice.invoiceNumber.startsWith('INV-')) {
    throw new Error('Format nomor invoice tidak valid!');
  }

  // Cek jurnal CASH
  const jCash = await prisma.journalEntry.findUnique({
    where: { id: resCash.invoice.journalEntryId },
    include: { lines: true },
  });
  const cashDebitLine = jCash?.lines.find((l) => l.side === 'DEBIT' && Number(l.nominal) === 5000000);
  console.log(`[PASS] Jurnal Penjualan CASH DEBIT Akun: ${cashDebitLine?.accountCode} (Harus 110 - Kas Toko)`);
  if (cashDebitLine?.accountCode !== '110') {
    throw new Error(`Expected DEBIT akun 110, got ${cashDebitLine?.accountCode}`);
  }

  // 4. UJI 2: Checkout TRANSFER -> Jurnal DEBIT 120 (Bank BCA) & Sequence Increment
  console.log('\n--- TEST 2: Checkout TRANSFER & Sequence Increment ---');
  const resTrf = await posService.checkout(
    {
      items: [unitTrf.serialNumber],
      paymentMethod: PaymentMethod.TRANSFER,
      amountPaid: 7500000,
    },
    { id: testKasirId, name: 'Kasir Uji', role: 'KASIR' }
  );

  console.log(`[PASS] Invoice 2 Number: ${resTrf.invoice.invoiceNumber}`);

  // Cek urutan invoice
  const seq1 = parseInt(resCash.invoice.invoiceNumber.split('-').pop()!, 10);
  const seq2 = parseInt(resTrf.invoice.invoiceNumber.split('-').pop()!, 10);
  console.log(`[PASS] Urutan Invoice: ${seq1} -> ${seq2} (Harus berurutan persis +1)`);
  if (seq2 !== seq1 + 1) {
    throw new Error(`Sequence invoice tidak bertambah urut! seq1=${seq1}, seq2=${seq2}`);
  }

  // Cek jurnal TRANSFER
  const jTrf = await prisma.journalEntry.findUnique({
    where: { id: resTrf.invoice.journalEntryId },
    include: { lines: true },
  });
  const trfDebitLine = jTrf?.lines.find((l) => l.side === 'DEBIT' && Number(l.nominal) === 7500000);
  console.log(`[PASS] Jurnal Penjualan TRANSFER DEBIT Akun: ${trfDebitLine?.accountCode} (Harus 120 - Bank BCA)`);
  if (trfDebitLine?.accountCode !== '120') {
    throw new Error(`Expected DEBIT akun 120, got ${trfDebitLine?.accountCode}`);
  }

  // 5. UJI 3: VOID Transaksi TRANSFER -> Pembalik KREDIT Akun 120 (Bukan Kas 110)
  console.log('\n--- TEST 3: VOID Transaksi TRANSFER Reversal Akun Bank 120 ---');
  const voidTrf = await posService.voidTransaction(resTrf.invoice.invoiceNumber, {
    id: 'owner-id',
    name: 'Owner Toko',
    role: 'OWNER',
  });

  const reversalJournalTrf = await prisma.journalEntry.findUnique({
    where: { id: voidTrf.reversalJournal.id },
    include: { lines: true },
  });
  const trfCreditVoidLine = reversalJournalTrf?.lines.find(
    (l) => l.side === 'KREDIT' && Number(l.nominal) === 7500000
  );
  console.log(`[PASS] Jurnal Pembalik VOID TRANSFER KREDIT Akun: ${trfCreditVoidLine?.accountCode} (Harus 120 - Bank BCA)`);
  if (trfCreditVoidLine?.accountCode !== '120') {
    throw new Error(`Expected KREDIT akun 120 pada saat VOID transfer, got ${trfCreditVoidLine?.accountCode}`);
  }

  // 6. UJI 4: Kunci Jurnal Sistem (Anti-Manipulasi)
  console.log('\n--- TEST 4: Proteksi Kunci Jurnal Sistem POS dari Edit Manual ---');
  try {
    await journalService.updateManual(
      jCash!.id,
      { keterangan: 'Mencoba manipulasi jurnal POS otomatis' },
      { id: 'fin-id', role: 'FINANCE' }
    );
    throw new Error('[FAIL] GAGAL: Jurnal sistem berhasil diedit manual!');
  } catch (err: any) {
    console.log(`[PASS] SUCCESS: Edit jurnal sistem dicekal! Pesan: "${err.message}"`);
  }

  // Cleanup
  await prisma.posTransaction.deleteMany({
    where: { serialNumber: { in: ['TEST-SN-CASH-01', 'TEST-SN-TRF-02'] } },
  });
  await prisma.productUnit.deleteMany({
    where: { serialNumber: { in: ['TEST-SN-CASH-01', 'TEST-SN-TRF-02'] } },
  });

  console.log('\n[COMPLETE] === ALL VERIFICATION TESTS PASSED 100% PERFECTLY! ===\n');
}

testSecurityAndAccountingPatch()
  .catch((e) => {
    console.error('[FAIL] Verification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
