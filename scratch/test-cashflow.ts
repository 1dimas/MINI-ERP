import { PrismaClient } from '@prisma/client';
import { CashflowService } from '../src/cashflow/cashflow.service.js';
import { CashflowType } from '../src/cashflow/dto/create-cashflow.dto.js';

const prisma = new PrismaClient();
const service = new CashflowService(prisma as any);

async function test() {
  console.log('--- TEST 1: CEGAH SALDO MINUS ---');
  try {
    await service.create(
      {
        type: CashflowType.CASHFLOW_OUT,
        keterangan: 'Belanja Fiktif 100 Juta',
        sourceAccountCode: '110',
        targetAccountCode: '520',
        nominal: 100000000,
      },
      { id: 'user-fin', role: 'FINANCE' }
    );
    console.log('❌ FAIL: Harus melempar BadRequestException Saldo Tidak Mencukupi!');
  } catch (err: any) {
    console.log('✅ PASS:', err.message);
  }

  console.log('\n--- TEST 2: PROTEKSI TANGGAL MUNDUR (> 24 JAM) ---');
  try {
    const oldDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    await service.create(
      {
        type: CashflowType.CASHFLOW_OUT,
        keterangan: 'Tagihan 3 Hari Lalu',
        sourceAccountCode: '110',
        targetAccountCode: '520',
        nominal: 50000,
        tanggal: oldDate,
      },
      { id: 'user-fin', role: 'FINANCE' }
    );
    console.log('❌ FAIL: Harus menolak backdating > 24 jam untuk Finance!');
  } catch (err: any) {
    console.log('✅ PASS:', err.message);
  }

  console.log('\n--- TEST 3: MAKER-CHECKER (FINANCE DRAFT -> OWNER APPROVE) ---');
  const initialKasBalance = await service.getAccountPostedBalance('110');
  console.log('Saldo Kas (Awal):', initialKasBalance);

  const draftEntry = await service.create(
    {
      type: CashflowType.CASHFLOW_OUT,
      keterangan: 'Bayar Listrik PLN Rp 200.000',
      sourceAccountCode: '110',
      targetAccountCode: '520',
      nominal: 200000,
    },
    { id: 'user-fin', role: 'FINANCE' }
  );

  console.log('Draf Dibuat ID:', draftEntry.id, '| Status:', draftEntry.status);

  const balanceAfterDraft = await service.getAccountPostedBalance('110');
  console.log('Saldo Kas (Saat DRAFT):', balanceAfterDraft, '| (Wajib Tidak Berkurang)');

  const approvedEntry = await service.approve(draftEntry.id, { role: 'OWNER' });
  console.log('Status Setelah Approved Owner:', approvedEntry.status);

  const balanceAfterApproved = await service.getAccountPostedBalance('110');
  console.log('Saldo Kas (Setelah POSTED):', balanceAfterApproved, '| (Berkurang Rp 200.000)');

  console.log('\n--- TEST 4: REJECT WORKFLOW (DRAFT -> REJECTED) ---');
  const rejectedDraft = await service.create(
    {
      type: CashflowType.CASHFLOW_OUT,
      keterangan: 'Klaim Biaya Mencurigakan Rp 100.000',
      sourceAccountCode: '110',
      targetAccountCode: '520',
      nominal: 100000,
    },
    { id: 'user-fin', role: 'FINANCE' }
  );

  const resultRejected = await service.reject(rejectedDraft.id, { role: 'OWNER' });
  console.log('Status Setelah Rejected Owner:', resultRejected.status);

  const balanceAfterRejected = await service.getAccountPostedBalance('110');
  console.log('Saldo Kas Akhir:', balanceAfterRejected, '| (Tetap Tidak Terpengaruh)');
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
