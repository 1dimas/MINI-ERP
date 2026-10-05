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
    { code: '530', name: 'Beban Selisih Kas', type: 'BEBAN', normalBalance: 'DEBIT' },
  ];

  for (const item of coaData) {
    await prisma.chartOfAccount.upsert({
      where: { code: item.code },
      update: {},
      create: item,
    });
  }

  // Clear previous units & models for clean seed
  await prisma.posTransaction.deleteMany({});
  await prisma.productUnit.deleteMany({});
  await prisma.productModel.deleteMany({});
  await prisma.journalLine.deleteMany({});
  await prisma.journalEntry.deleteMany({});

  // 3. Journal Entry 1: Modal Awal Rp 20.000.000
  await prisma.journalEntry.create({
    data: {
      keterangan: 'Setoran Modal Awal Pemilik',
      sourceType: 'MANUAL',
      total: 20000000,
      lines: {
        create: [
          { accountCode: '110', side: 'DEBIT', nominal: 20000000 },
          { accountCode: '310', side: 'KREDIT', nominal: 20000000 },
        ],
      },
    },
  });

  // 4. Seed Data Katalog Induk (ProductModel)
  const modelThinkpad = await prisma.productModel.create({
    data: {
      sku: 'L-THINK-T14G2',
      name: 'Lenovo ThinkPad T14 Gen 2 (i5 11th / 16GB / 512GB)',
      category: 'LAPTOP',
    },
  });

  const modelMacbook = await prisma.productModel.create({
    data: {
      sku: 'L-MAC-AIRM1',
      name: 'MacBook Air M1 2020 8GB / 256GB Gray',
      category: 'LAPTOP',
    },
  });

  const modelAsusRog = await prisma.productModel.create({
    data: {
      sku: 'L-ROG-G14',
      name: 'Asus ROG Zephyrus G14 Ryzen 7 / 16GB / 512GB',
      category: 'LAPTOP',
    },
  });

  // 5. DEMO RELASI 1-TO-MANY: 1 KATALOG INDUK (Lenovo ThinkPad T14) -> MEMILIKI 3 UNIT FISIK DENGAN SN BERBEDA

  // --- UNIT 1 (ThinkPad T14 - Unit BARU Segel Box) ---
  const j1 = await prisma.journalEntry.create({
    data: {
      keterangan: `Restock Unit Fisik ${modelThinkpad.name} (SN: SN-THINKPAD-T14-001)`,
      sourceType: 'RESTOCK',
      status: 'POSTED',
      total: 6800000,
      lines: {
        create: [
          { accountCode: '130', side: 'DEBIT', nominal: 6800000 },
          { accountCode: '110', side: 'KREDIT', nominal: 6800000 },
        ],
      },
    },
  });

  await prisma.productUnit.create({
    data: {
      serialNumber: 'SN-THINKPAD-T14-001',
      productModelId: modelThinkpad.id, // Relasi ke Katalog Induk ThinkPad
      condition: 'NEW',
      grade: null,
      hpp: 6800000,
      price: 8500000,
      status: 'AVAILABLE',
      isFisikNormal: true,
      isMesinNormal: true,
      isStorageNormal: true,
      isSuhuNormal: true,
      isKeyboardNormal: true,
      isTouchpadNormal: true,
      isPortNormal: true,
      isWebcamNormal: true,
      catatanFisik: null,
      purchaseJournalId: j1.id,
    },
  });

  // --- UNIT 2 (ThinkPad T14 - Unit SECOND Grade B) ---
  const j2 = await prisma.journalEntry.create({
    data: {
      keterangan: `Restock Unit Fisik ${modelThinkpad.name} (SN: SN-THINKPAD-T14-002)`,
      sourceType: 'RESTOCK',
      status: 'POSTED',
      total: 6200000,
      lines: {
        create: [
          { accountCode: '130', side: 'DEBIT', nominal: 6200000 },
          { accountCode: '110', side: 'KREDIT', nominal: 6200000 },
        ],
      },
    },
  });

  await prisma.productUnit.create({
    data: {
      serialNumber: 'SN-THINKPAD-T14-002',
      productModelId: modelThinkpad.id, // Relasi ke Katalog Induk ThinkPad yang SAMA
      condition: 'SECOND',
      grade: 'B',
      hpp: 6200000,
      price: 7900000,
      status: 'AVAILABLE',
      isFisikNormal: true,
      isMesinNormal: true,
      isStorageNormal: true,
      isSuhuNormal: true,
      isKeyboardNormal: true,
      isTouchpadNormal: true,
      isPortNormal: true,
      isWebcamNormal: true,
      catatanFisik: 'Baret tipis halus di top cover.',
      purchaseJournalId: j2.id,
    },
  });

  // --- UNIT 3 (ThinkPad T14 - Unit SECOND Grade C - QC Pending) ---
  const j3 = await prisma.journalEntry.create({
    data: {
      keterangan: `Restock Unit Fisik ${modelThinkpad.name} (SN: SN-THINKPAD-T14-003)`,
      sourceType: 'RESTOCK',
      status: 'DRAFT',
      total: 5800000,
      lines: {
        create: [
          { accountCode: '130', side: 'DEBIT', nominal: 5800000 },
          { accountCode: '110', side: 'KREDIT', nominal: 5800000 },
        ],
      },
    },
  });

  await prisma.productUnit.create({
    data: {
      serialNumber: 'SN-THINKPAD-T14-003',
      productModelId: modelThinkpad.id, // Relasi ke Katalog Induk ThinkPad yang SAMA
      condition: 'SECOND',
      grade: 'C',
      hpp: 5800000,
      price: 7500000,
      status: 'QC_PENDING',
      isFisikNormal: true,
      isMesinNormal: true,
      isStorageNormal: true,
      isSuhuNormal: true,
      isKeyboardNormal: false,
      isTouchpadNormal: true,
      isPortNormal: true,
      isWebcamNormal: true,
      catatanFisik: 'Keyboard ada 2 tombol huruf mati, butuh perbaikan.',
      purchaseJournalId: j3.id,
    },
  });

  // --- UNIT MACBOOK AIR M1 ---
  const j4 = await prisma.journalEntry.create({
    data: {
      keterangan: `Restock Unit Fisik ${modelMacbook.name} (SN: SN-MACBOOK-AIR-002)`,
      sourceType: 'RESTOCK',
      status: 'DRAFT',
      total: 7000000,
      lines: {
        create: [
          { accountCode: '130', side: 'DEBIT', nominal: 7000000 },
          { accountCode: '110', side: 'KREDIT', nominal: 7000000 },
        ],
      },
    },
  });

  await prisma.productUnit.create({
    data: {
      serialNumber: 'SN-MACBOOK-AIR-002',
      productModelId: modelMacbook.id,
      condition: 'SECOND',
      grade: 'C',
      hpp: 7000000,
      price: 9200000,
      status: 'QC_PENDING',
      isFisikNormal: false,
      isMesinNormal: true,
      isStorageNormal: true,
      isSuhuNormal: true,
      isKeyboardNormal: false,
      isTouchpadNormal: true,
      isPortNormal: true,
      isWebcamNormal: true,
      catatanFisik: 'Dent di sudut kiri bawah.',
      purchaseJournalId: j4.id,
    },
  });

  // --- UNIT ASUS ROG ---
  const j5 = await prisma.journalEntry.create({
    data: {
      keterangan: `Restock Unit Fisik ${modelAsusRog.name} (SN: SN-ASUS-ROG-003)`,
      sourceType: 'RESTOCK',
      status: 'POSTED',
      total: 9500000,
      lines: {
        create: [
          { accountCode: '130', side: 'DEBIT', nominal: 9500000 },
          { accountCode: '110', side: 'KREDIT', nominal: 9500000 },
        ],
      },
    },
  });

  await prisma.productUnit.create({
    data: {
      serialNumber: 'SN-ASUS-ROG-003',
      productModelId: modelAsusRog.id,
      condition: 'SECOND',
      grade: 'B',
      hpp: 9500000,
      price: 12500000,
      status: 'IN_REPAIR',
      isFisikNormal: true,
      isMesinNormal: true,
      isStorageNormal: true,
      isSuhuNormal: false,
      isKeyboardNormal: true,
      isTouchpadNormal: true,
      isPortNormal: true,
      isWebcamNormal: true,
      catatanFisik: 'Suhu agak hangat under heavy load. Perlu repaste.',
      purchaseJournalId: j5.id,
    },
  });

  console.log('[SUCCESS] Data Seed Berhasil: 1 Katalog Induk ThinkPad T14 kini memiliki 3 Unit Fisik (SN-001, SN-002, SN-003)!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });