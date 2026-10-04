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
   * 5. Catat record PosTransaction
   * 6. Auto-Journal 4 baris JournalLine (110, 410, 440, 130) berstatus POSTED
   */
  async checkout(
    dto: CheckoutDto,
    user?: { id?: string; name?: string; email?: string; role?: string },
  ) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Keranjang belanja kosong. Masukkan minimal 1 unit barang.');
    }

    // Cek duplikasi Serial Number di dalam keranjang
    const normalizedItems = dto.items.map((sn) => sn.trim().toUpperCase());
    const uniqueItems = new Set(normalizedItems);
    if (uniqueItems.size !== normalizedItems.length) {
      throw new BadRequestException('Terdapat duplikasi Serial Number dalam keranjang transaksi.');
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

      // Generate nomor invoice unik
      const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const invoiceNumber = `INV-${dateCode}-${randomSuffix}`;
      const cashierName = user?.name || user?.email || 'Kasir Toko';

      // 5. Catat Transaksi di tabel PosTransaction
      const posTx = await tx.posTransaction.create({
        data: {
          serialNumber: units.map((u) => u.serialNumber).join(', '),
          productUnitId: units.length === 1 ? units[0].id : null,
          totalPrice: totalPenjualan,
          totalHpp: totalHpp,
          cashierName,
        },
      });

      // 6. Auto-Journal (Krusial): Buat JournalEntry (sourceType: 'POS', status: 'POSTED')
      // 4 baris JournalLine:
      // DEBIT  110 (Kas Toko)          = totalPenjualan
      // KREDIT 410 (Penjualan POS)     = totalPenjualan
      // DEBIT  440 (HPP Penjualan)     = totalHpp
      // KREDIT 130 (Persediaan Barang) = totalHpp
      const journalEntry = await tx.journalEntry.create({
        data: {
          tanggal: new Date(),
          keterangan: `Penjualan POS [${invoiceNumber}] - Kasir: ${cashierName}`,
          sourceType: 'POS',
          sourceId: posTx.id,
          status: 'POSTED',
          total: totalPenjualan,
          lines: {
            create: [
              {
                accountCode: '110',
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

      const kembalian = dto.amountPaid - totalPenjualan;

      // Response: data invoice dan kembalian
      const invoice = {
        id: posTx.id,
        invoiceNumber,
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
        change: kembalian, // alias
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
    const transaction = await this.prisma.posTransaction.findUnique({
      where: { id },
      include: {
        productUnit: {
          include: {
            productModel: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaksi POS dengan ID '${id}' tidak ditemukan.`);
    }

    return transaction;
  }
}
