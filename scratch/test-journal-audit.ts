import { PrismaClient } from '@prisma/client';
import { JournalService } from '../src/journal/journal.service.js';
import { AuditAction } from '../src/journal/dto/audit-journal.dto.js';

const prisma = new PrismaClient();
const journalService = new JournalService(prisma as any);

async function test() {
  console.log('--- TEST 1: POST /journal/manual OLEH FINANCE (PAKSA STATUS DRAFT) ---');
  const financeEntry = await journalService.createManual(
    {
      keterangan: 'Jurnal Manual Tambahan Beban Usaha',
      lines: [
        { accountCode: '520', side: 'DEBIT', nominal: 150000 },
        { accountCode: '110', side: 'KREDIT', nominal: 150000 },
      ],
    },
    { id: 'user-fin', role: 'FINANCE' }
  );

  console.log('ID:', financeEntry.id);
  console.log('Status Finance Entry:', financeEntry.status, '| (Wajib DRAFT)');

  console.log('\n--- TEST 2: POST /journal/manual OLEH OWNER (LANGSUNG POSTED) ---');
  const ownerEntry = await journalService.createManual(
    {
      keterangan: 'Jurnal Manual Langsung Owner',
      lines: [
        { accountCode: '110', side: 'DEBIT', nominal: 400000 },
        { accountCode: '410', side: 'KREDIT', nominal: 400000 },
      ],
    },
    { id: 'user-owner', role: 'OWNER' }
  );

  console.log('Status Owner Entry:', ownerEntry.status, '| (Wajib POSTED)');

  console.log('\n--- TEST 3: UNBALANCED DOUBLE-ENTRY CHECK ---');
  try {
    await journalService.createManual(
      {
        keterangan: 'Transaksi Unbalanced Fiktif',
        lines: [
          { accountCode: '110', side: 'DEBIT', nominal: 500000 },
          { accountCode: '410', side: 'KREDIT', nominal: 300000 },
        ],
      },
      { id: 'user-fin', role: 'FINANCE' }
    );
    console.log('[FAIL] FAIL: Harus menolak jurnal tidak seimbang!');
  } catch (err: any) {
    console.log('[PASS] PASS:', err.message);
  }

  console.log('\n--- TEST 4: AUDIT APPROVE OLEH OWNER (DRAFT -> POSTED) ---');
  const approved = await journalService.auditStatus(financeEntry.id, {
    action: AuditAction.APPROVE,
  });
  console.log('Status Setelah APPROVE Owner:', approved.status);

  console.log('\n--- TEST 5: AUDIT REJECT OLEH OWNER (DRAFT -> REJECTED) ---');
  const draftToReject = await journalService.createManual(
    {
      keterangan: 'Jurnal Draf yang Akan Ditolak',
      lines: [
        { accountCode: '520', side: 'DEBIT', nominal: 80000 },
        { accountCode: '110', side: 'KREDIT', nominal: 80000 },
      ],
    },
    { id: 'user-fin', role: 'FINANCE' }
  );

  const rejected = await journalService.auditStatus(draftToReject.id, {
    action: AuditAction.REJECT,
  });
  console.log('Status Setelah REJECT Owner:', rejected.status);

  console.log('\n--- TEST 6: GET /journal FILTER ---');
  const draftList = await journalService.findAll({ status: 'DRAFT' });
  const postedList = await journalService.findAll({ status: 'POSTED', sourceType: 'MANUAL' });
  const rejectedList = await journalService.findAll({ status: 'REJECTED' });

  console.log('Draft Count:', draftList.length);
  console.log('Posted Manual Count:', postedList.length);
  console.log('Rejected Count:', rejectedList.length);
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
