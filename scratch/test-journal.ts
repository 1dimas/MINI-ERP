import { PrismaClient } from '@prisma/client';
import { JournalService } from '../src/journal/journal.service.js';
import { AccountingService } from '../src/accounting/accounting.service.js';

const prisma = new PrismaClient();
const journalService = new JournalService(prisma as any);
const accountingService = new AccountingService(prisma as any);

async function test() {
  console.log('--- TEST 1: BUAT JURNAL MANUAL (STATUS DRAFT) ---');
  const draftJournal = await journalService.createManual({
    keterangan: 'Jurnal Manual Uji Coba Tim Keuangan (DRAFT)',
    lines: [
      { accountCode: '110', side: 'DEBIT', nominal: 500000 },
      { accountCode: '410', side: 'KREDIT', nominal: 500000 },
    ],
  }, { id: 'test-user', role: 'FINANCE' });

  console.log('Berhasil Dibuat ID:', draftJournal.id);
  console.log('Status Jurnal:', draftJournal.status);

  console.log('\n--- TEST 2: CEK NERACA SALDO SEBELUM AUDIT (DRAFT DIBUANG) ---');
  const tbBefore = await accountingService.getTrialBalance({});
  console.log('Total Debit (Sebelum Audit):', tbBefore.summary.totalDebit);

  console.log('\n--- TEST 3: AUDIT JURNAL OLEH OWNER (STATUS JADI POSTED) ---');
  const audited = await journalService.auditStatus(draftJournal.id, { action: 'APPROVE' as any });
  console.log('Status Setelah Audit:', audited.status);

  console.log('\n--- TEST 4: CEK NERACA SALDO SETELAH AUDIT (POSTED MASUK) ---');
  const tbAfter = await accountingService.getTrialBalance({});
  console.log('Total Debit (Setelah Audit):', tbAfter.summary.totalDebit);
  console.log('Is Balanced:', tbAfter.summary.isBalanced);
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
