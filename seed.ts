import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const defaultPassword = await bcrypt.hash('AdminSolit2026!', 10);
  const kasirPassword = await bcrypt.hash('Kasir123!', 10);
  const financePassword = await bcrypt.hash('Finance123!', 10);

  // 1. Akun User
  const owner = await prisma.user.upsert({
    where: { email: 'dimas@solitpos.com' },
    update: {},
    create: {
      email: 'dimas@solitpos.com',
      name: 'Dimas Owner',
      password: defaultPassword,
      role: 'OWNER',
    },
  });

  const kasir = await prisma.user.upsert({
    where: { email: 'kasir@solitpos.com' },
    update: {},
    create: {
      email: 'kasir@solitpos.com',
      name: 'Budi Kasir',
      password: kasirPassword,
      role: 'KASIR',
    },
  });

  const finance = await prisma.user.upsert({
    where: { email: 'finance@solitpos.com' },
    update: {},
    create: {
      email: 'finance@solitpos.com',
      name: 'Siti Keuangan',
      password: financePassword,
      role: 'FINANCE',
    },
  });

  // 2. Chart of Accounts (COA)
  const coaData = [
    { code: '110', name: 'Kas Toko', type: 'ASET', normalBalance: 'DEBIT' },
    { code: '120', name: 'Bank BCA', type: 'ASET', normalBalance: 'DEBIT' },
    { code: '130', name: 'Persediaan Barang', type: 'ASET', normalBalance: 'DEBIT' },
    { code: '210', name: 'Hutang Usaha', type: 'KEWAJIBAN', normalBalance: 'KREDIT' },
    { code: '310', name: 'Modal Pemilik', type: 'EKUITAS', normalBalance: 'KREDIT' },
    { code: '410', name: 'Penjualan POS', type: 'PENDAPATAN', normalBalance: 'KREDIT' },
    { code: '440', name: 'HPP Penjualan', type: 'BEBAN', normalBalance: 'DEBIT' },
    { code: '510', name: 'Beban Gaji', type: 'BEBAN', normalBalance: 'DEBIT' },
    { code: '520', name: 'Beban Listrik & Air', type: 'BEBAN', normalBalance: 'DEBIT' },
  ];

  for (const item of coaData) {
    await prisma.chartOfAccount.upsert({
      where: { code: item.code },
      update: {},
      create: item,
    });
  }

  // Clear previous journals for clean verification
  await prisma.journalLine.deleteMany({});
  await prisma.journalEntry.deleteMany({});

  // 3. Journal Entry 1: Modal Awal Rp 10.000.000
  await prisma.journalEntry.create({
    data: {
      keterangan: 'Setoran Modal Awal Pemilik',
      sourceType: 'MANUAL',
      total: 10000000,
      lines: {
        create: [
          { accountCode: '110', side: 'DEBIT', nominal: 10000000 },
          { accountCode: '310', side: 'KREDIT', nominal: 10000000 },
        ],
      },
    },
  });

  // 4. Journal Entry 2: Penjualan Kasir POS Rp 2.500.000
  await prisma.journalEntry.create({
    data: {
      keterangan: 'Penjualan POS Nota #001',
      sourceType: 'POS',
      total: 2500000,
      lines: {
        create: [
          { accountCode: '110', side: 'DEBIT', nominal: 2500000 },
          { accountCode: '410', side: 'KREDIT', nominal: 2500000 },
        ],
      },
    },
  });

  // 5. Journal Entry 3: HPP Penjualan Nota #001 Rp 1.500.000
  await prisma.journalEntry.create({
    data: {
      keterangan: 'HPP Penjualan Nota #001',
      sourceType: 'POS',
      total: 1500000,
      lines: {
        create: [
          { accountCode: '440', side: 'DEBIT', nominal: 1500000 },
          { accountCode: '130', side: 'KREDIT', nominal: 1500000 },
        ],
      },
    },
  });

  // 6. Journal Entry 4: Pembayaran Beban Listrik Rp 300.000
  await prisma.journalEntry.create({
    data: {
      keterangan: 'Pembayaran PLN Bulan Ini',
      sourceType: 'CASHFLOW',
      total: 300000,
      lines: {
        create: [
          { accountCode: '520', side: 'DEBIT', nominal: 300000 },
          { accountCode: '110', side: 'KREDIT', nominal: 300000 },
        ],
      },
    },
  });

  console.log(`✅ Data User, COA, dan Jurnal Double-Entry berhasil ditanam!`);
}

main()
  .catch((e) => {
    console.error('Gagal menanam data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });