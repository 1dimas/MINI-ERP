import { PrismaClient } from '@prisma/client';
import { JournalService } from '../src/journal/journal.service.js';

const prisma = new PrismaClient();
const journalService = new JournalService(prisma as any);

async function test() {
  console.log('--- TEST 1: BUAT JURNAL UNTUK EDIT ---');
  const entry = await journalService.createManual(
    {
      keterangan: 'Jurnal Keterangan Awal',
      lines: [
        { accountCode: '110', side: 'DEBIT', nominal: 100000 },
        { accountCode: '410', side: 'KREDIT', nominal: 100000 },
      ],
    },
    { id: 'user-fin', role: 'FINANCE' }
  );

  console.log('ID:', entry.id);
  console.log('Keterangan Awal:', entry.keterangan);
  console.log('isEdited Awal:', entry.isEdited);

  console.log('\n--- TEST 2: PUT /journal/:id (UPDATE JURNAL BY FINANCE) ---');
  const updated = await journalService.updateManual(
    entry.id,
    {
      keterangan: 'Jurnal Keterangan Revisi Setelah Audit Internal',
      lines: [
        { accountCode: '110', side: 'DEBIT', nominal: 250000 },
        { accountCode: '410', side: 'KREDIT', nominal: 250000 },
      ],
    },
    { id: 'user-fin', role: 'FINANCE' }
  );

  console.log('Keterangan Baru:', updated.keterangan);
  console.log('Total Baru:', Number(updated.total));
  console.log('isEdited Baru:', updated.isEdited, '| (Wajib true)');
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
