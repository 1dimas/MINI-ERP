import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto } from './dto/checkout.dto';

@Injectable()
export class PosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * POST /pos/checkout: Eksekusi transaksi penjualan kasir (Atomik)
   * 1. Validasi keberadaan dan ketersediaan unit fisik (status === 'AVAILABLE')
   * 2. Hitung totalPenjualan dan totalHpp
   * 3. Validasi nominal uang bayar >= totalPenjualan
   * 4. Update status unit menjadi 'SOLD'
   * 5. Catat record PosTransaction (status: 'SUCCESS', invoiceNumber)
   * 6. Auto-Journal 4 baris JournalLine (110, 410, 440, 130) berstatus POSTED
   */
  async checkout(
    dto: CheckoutDto,
    user: { id: string; name?: string; email?: string; role?: string },
  ) {
    if (!user || !user.id) {
      throw new BadRequestException('Kasir harus terautentikasi.');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Keranjang belanja kosong. Masukkan minimal 1 unit barang.');
    }

    // Cek duplikasi Serial Number di dalam keranjang
    const normalizedItems = dto.items.map((sn) => sn.trim().toUpperCase());
    const uniqueItems = new Set(normalizedItems);
    if (uniqueItems.size !== normalizedItems.length) {
      throw new BadRequestException('Terdapat duplikasi Serial Number dalam keranjang transaksi.');
    }

    // Wajib cek apakah kasir memiliki shift 'OPEN' khusus miliknya sendiri
    const activeShift = await this.prisma.cashierShift.findFirst({
      where: { userId: user.id, status: 'OPEN' },
    });

    if (!activeShift) {
      throw new BadRequestException('Buka shift/kasir terlebih dahulu');
    }

    // Eksekusi seluruh alur dalam prisma.$transaction secara atomik & absolut
    return this.prisma.$transaction(async (tx) => {
      // 1. Validasi Unit Fisik
      const units: any[] = [];
      for (const sn of normalizedItems) {
        const unit = await tx.productUnit.findUnique({
          where: { serialNumber: sn },
          include: { productModel: true },
        });

        if (!unit || unit.status !== 'AVAILABLE') {
          throw new BadRequestException(`Unit ${sn} tidak tersedia atau sudah terjual`);
        }

        units.push(unit);
      }

      // 2. Hitung totalPenjualan & totalHpp
      let totalPenjualan = 0;
      let totalHpp = 0;

      for (const unit of units) {
        totalPenjualan += Number(unit.price);
        totalHpp += Number(unit.hpp);
      }

      // 3. Validasi Uang Bayar
      if (dto.amountPaid < totalPenjualan) {
        throw new BadRequestException('Uang bayar kurang');
      }

      // 4. Update Stok Unit -> 'SOLD'
      const unitIds = units.map((u) => u.id);
      await tx.productUnit.updateMany({
        where: { id: { in: unitIds } },
        data: { status: 'SOLD' },
      });

      // Generate nomor invoice berurutan (INV-YYYYMMDD-XXXX)
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const datePrefix = `INV-${yyyy}${mm}${dd}-`;

      const lastTxToday = await tx.posTransaction.findFirst({
        where: {
          invoiceNumber: {
            startsWith: datePrefix,
          },
        },
        orderBy: {
          invoiceNumber: 'desc',
        },
        select: { invoiceNumber: true },
      });

      let sequence = 1;
      if (lastTxToday?.invoiceNumber) {
        const parts = lastTxToday.invoiceNumber.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) {
          sequence = lastSeq + 1;
        }
      }
      const invoiceNumber = `${datePrefix}${String(sequence).padStart(4, '0')}`;
      const cashierName = user.name || user.email || 'Kasir Toko';

      // 5. Catat Transaksi di tabel PosTransaction
      const paymentMethod = dto.paymentMethod || 'CASH';
      const posTx = await tx.posTransaction.create({
        data: {
          invoiceNumber,
          status: 'SUCCESS',
          paymentMethod,
          serialNumber: units.map((u) => u.serialNumber).join(', '),
          productUnitId: units.length === 1 ? units[0].id : null,
          totalPrice: totalPenjualan,
          totalHpp: totalHpp,
          cashierName,
          shiftId: activeShift.id,
          createdBy: user.id,
          approvedBy: user.id,
          approvedAt: now,
        },
      });

      // 6. Auto-Journal (Krusial): Buat JournalEntry (sourceType: 'POS', status: 'POSTED')
      // Pemetaan Akun Kas / Bank:
      // CASH -> '110' (Kas Toko)
      // TRANSFER -> '120' (Bank BCA)
      const cashAccountCode = paymentMethod === 'TRANSFER' ? '120' : '110';

      const journalEntry = await tx.journalEntry.create({
        data: {
          tanggal: now,
          keterangan: `Penjualan POS [${invoiceNumber}] - Kasir: ${cashierName} (${paymentMethod})`,
          sourceType: 'POS',
          sourceId: posTx.id,
          status: 'POSTED',
          total: totalPenjualan,
          createdBy: user.id,
          approvedBy: user.id,
          approvedAt: now,
          lines: {
            create: [
              {
                accountCode: cashAccountCode,
                side: 'DEBIT',
                nominal: totalPenjualan,
              },
              {
                accountCode: '410',
                side: 'KREDIT',
                nominal: totalPenjualan,
              },
              {
                accountCode: '440',
                side: 'DEBIT',
                nominal: totalHpp,
              },
              {
                accountCode: '130',
                side: 'KREDIT',
                nominal: totalHpp,
              },
            ],
          },
        },
        include: {
          lines: true,
        },
      });

      // Update journalEntryId di PosTransaction
      await tx.posTransaction.update({
        where: { id: posTx.id },
        data: { journalEntryId: journalEntry.id },
      });

      const kembalian = dto.amountPaid - totalPenjualan;

      // Response: data invoice dan kembalian
      const invoice = {
        id: posTx.id,
        invoiceNumber,
        status: 'SUCCESS',
        tanggal: posTx.tanggal,
        paymentMethod: dto.paymentMethod,
        cashierName,
        items: units.map((u) => ({
          id: u.id,
          serialNumber: u.serialNumber,
          modelName: u.productModel?.name,
          category: u.productModel?.category,
          condition: u.condition,
          grade: u.grade,
          price: Number(u.price),
          hpp: Number(u.hpp),
        })),
        totalPenjualan,
        totalHpp,
        amountPaid: dto.amountPaid,
        kembalian,
        journalEntryId: journalEntry.id,
      };

      return {
        success: true,
        message: `Transaksi kasir berhasil diproses (${invoiceNumber})`,
        invoice,
        kembalian,
        change: kembalian,
      };
    });
  }

  /**
   * POST /pos/void/:invoiceNumber
   * Otorisasi khusus OWNER: Membatalkan transaksi kasir, mengembalikan stok unit menjadi AVAILABLE,
   * menandai transaksi menjadi VOID, dan membuat Jurnal Pembalik (Reversal) atomik.
   */
  async voidTransaction(
    invoiceNumber: string,
    user?: { id?: string; name?: string; role?: string },
  ) {
    const normalizedInvoice = invoiceNumber.trim();

    return this.prisma.$transaction(async (tx) => {
      // 1. Cari PosTransaction berdasarkan invoiceNumber (atau ID)
      const posTx = await tx.posTransaction.findFirst({
        where: {
          OR: [
            { invoiceNumber: normalizedInvoice },
            { id: normalizedInvoice },
          ],
        },
        include: {
          productUnit: {
            include: {
              productModel: true,
            },
          },
        },
      });

      // 2. Validasi Keberadaan & Status Transaksi
      if (!posTx) {
        throw new BadRequestException(
          `Transaksi dengan invoice/ID '${normalizedInvoice}' tidak ditemukan.`,
        );
      }

      if (posTx.status === 'VOID') {
        throw new BadRequestException(
          `Transaksi [${posTx.invoiceNumber || normalizedInvoice}] sudah pernah di-VOID sebelumnya.`,
        );
      }

      // Ambil daftar Serial Number dari transaksi
      const serialNumbers = posTx.serialNumber
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);

      // Cari unit fisik yang terjual
      const units = await tx.productUnit.findMany({
        where: {
          serialNumber: { in: serialNumbers },
        },
        include: { productModel: true },
      });

      // 3. Kembalikan Stok: Ubah status unit dari 'SOLD' kembali menjadi 'AVAILABLE'
      if (units.length > 0) {
        await tx.productUnit.updateMany({
          where: {
            id: { in: units.map((u) => u.id) },
          },
          data: {
            status: 'AVAILABLE',
          },
        });
      }

      // 4. Tandai Invoice: Ubah status PosTransaction menjadi 'VOID'
      const voidTime = new Date();
      const updatedTx = await tx.posTransaction.update({
        where: { id: posTx.id },
        data: {
          status: 'VOID',
          approvedBy: user?.id || null,
          approvedAt: voidTime,
        },
      });

      // 5. Jurnal Pembalik (Reversal): Buat JournalEntry baru dengan sourceType: 'POS_VOID' dan status: 'POSTED'
      // 4 baris JournalLine terbalik dari jurnal kasir:
      // DEBIT  410 (Penjualan POS)     = totalPenjualan (Memotong pengakuan pendapatan)
      // KREDIT 110/120 (Kas/Bank)      = totalPenjualan (Mengembalikan uang ke konsumen sesuai metode bayar)
      // DEBIT  130 (Persediaan Barang) = totalHpp        (Menambah kembali nilai aset toko)
      // KREDIT 440 (HPP Penjualan)     = totalHpp        (Memotong beban modal keluar)
      const totalPenjualan = Number(posTx.totalPrice);
      const totalHpp = Number(posTx.totalHpp);
      const displayInvoice = posTx.invoiceNumber || normalizedInvoice;
      const voidCashAccountCode = posTx.paymentMethod === 'TRANSFER' ? '120' : '110';

      const reversalJournal = await tx.journalEntry.create({
        data: {
          tanggal: voidTime,
          keterangan: `Void Invoice [${displayInvoice}] - Otorisasi Owner: ${user?.name || 'Owner'} (${posTx.paymentMethod})`,
          sourceType: 'POS_VOID',
          sourceId: posTx.id,
          status: 'POSTED',
          total: totalPenjualan,
          createdBy: user?.id || null,
          approvedBy: user?.id || null,
          approvedAt: voidTime,
          lines: {
            create: [
              {
                accountCode: '410',
                side: 'DEBIT',
                nominal: totalPenjualan,
              },
              {
                accountCode: voidCashAccountCode,
                side: 'KREDIT',
                nominal: totalPenjualan,
              },
              {
                accountCode: '130',
                side: 'DEBIT',
                nominal: totalHpp,
              },
              {
                accountCode: '440',
                side: 'KREDIT',
                nominal: totalHpp,
              },
            ],
          },
        },
        include: {
          lines: {
            include: {
              account: true,
            },
          },
        },
      });

      return {
        success: true,
        message: `Invoice [${displayInvoice}] berhasil dibatalkan (VOID). Seluruh unit fisik (${units.length} unit) telah dikembalikan ke status AVAILABLE dan jurnal pembalik telah dicatat.`,
        transaction: {
          id: updatedTx.id,
          invoiceNumber: displayInvoice,
          status: 'VOID',
          totalPenjualan,
          totalHpp,
          voidedAt: new Date(),
          voidedBy: user?.name || 'Owner',
          originalJournalEntryId: posTx.journalEntryId,
          reversalJournalId: reversalJournal.id,
        },
        restoredUnits: units.map((u) => ({
          id: u.id,
          serialNumber: u.serialNumber,
          modelName: u.productModel?.name,
          status: 'AVAILABLE',
        })),
        reversalJournal: {
          id: reversalJournal.id,
          keterangan: reversalJournal.keterangan,
          sourceType: reversalJournal.sourceType,
          total: Number(reversalJournal.total),
          lines: Array.isArray(reversalJournal.lines)
            ? reversalJournal.lines.map((l) => ({
                accountCode: l.accountCode,
                accountName: l.account?.name,
                side: l.side,
                nominal: Number(l.nominal),
              }))
            : [],
        },
      };
    });
  }

  /**
   * GET /pos/scan/:serialNumber: Scan barcode/QR serial number untuk dimasukkan ke keranjang kasir
   */
  async scanUnit(serialNumber: string) {
    const normalizedSn = serialNumber.trim().toUpperCase();

    const unit = await this.prisma.productUnit.findUnique({
      where: { serialNumber: normalizedSn },
      include: {
        productModel: true,
      },
    });

    if (!unit) {
      throw new NotFoundException(`Unit dengan Serial Number '${normalizedSn}' tidak ditemukan.`);
    }

    if (unit.status !== 'AVAILABLE') {
      throw new BadRequestException(
        `Unit ${normalizedSn} tidak tersedia atau sudah terjual (Status saat ini: ${unit.status}).`,
      );
    }

    return {
      id: unit.id,
      serialNumber: unit.serialNumber,
      modelName: unit.productModel.name,
      category: unit.productModel.category,
      sku: unit.productModel.sku,
      condition: unit.condition,
      grade: unit.grade,
      price: Number(unit.price),
      hpp: Number(unit.hpp),
      status: unit.status,
    };
  }

  /**
   * GET /pos/transactions: Riwayat transaksi POS
   */
  async getTransactions() {
    return this.prisma.posTransaction.findMany({
      orderBy: { tanggal: 'desc' },
      include: {
        productUnit: {
          include: {
            productModel: true,
          },
        },
      },
    });
  }

  /**
   * GET /pos/transactions/:id: Detail transaksi spesifik
   */
  async getTransactionById(id: string) {
    const transaction = await this.prisma.posTransaction.findFirst({
      where: {
        OR: [{ id }, { invoiceNumber: id }],
      },
      include: {
        productUnit: {
          include: {
            productModel: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaksi POS dengan ID/Invoice '${id}' tidak ditemukan.`);
    }

    return transaction;
  }
}
