import { PrismaClient } from '@prisma/client';

export interface CreateProductModelDto {
  sku: string;
  name: string;
  category?: string;
}

export interface CreateProductUnitDto {
  productModelId: string;
  serialNumber: string;
  condition: 'NEW' | 'SECOND' | string;
  grade?: 'A' | 'B' | 'C' | string | null;
  hpp: number;
  price: number;
  isFisikNormal?: boolean;
  isMesinNormal?: boolean;
  isStorageNormal?: boolean;
  isSuhuNormal?: boolean;
  isKeyboardNormal?: boolean;
  isTouchpadNormal?: boolean;
  isPortNormal?: boolean;
  isWebcamNormal?: boolean;
  catatanFisik?: string;
  paymentAccountCode?: string; // Default '110' (Kas Toko)
}

export interface UpdateProductUnitDto {
  serialNumber?: string;
  condition?: string;
  grade?: string | null;
  hpp?: number;
  addedHppCost?: number;
  price?: number;
  status?: string;
  isFisikNormal?: boolean;
  isMesinNormal?: boolean;
  isStorageNormal?: boolean;
  isSuhuNormal?: boolean;
  isKeyboardNormal?: boolean;
  isTouchpadNormal?: boolean;
  isPortNormal?: boolean;
  isWebcamNormal?: boolean;
  catatanFisik?: string;
  purchaseKeterangan?: string;
  paymentAccountCode?: string;
}

export interface UserContext {
  id: string;
  role: 'OWNER' | 'FINANCE' | 'KASIR' | string;
  name?: string;
}

export class InventoryService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 1. CREATE PRODUCT MODEL (Katalog Induk)
   */
  async createModel(dto: CreateProductModelDto) {
    if (!dto.sku || !dto.name) {
      const err: any = new Error('SKU dan Nama Katalog Induk wajib diisi!');
      err.status = 400;
      throw err;
    }

    const existingSku = await this.prisma.productModel.findUnique({
      where: { sku: dto.sku.trim().toUpperCase() },
    });

    if (existingSku) {
      return existingSku;
    }

    return await this.prisma.productModel.create({
      data: {
        sku: dto.sku.trim().toUpperCase(),
        name: dto.name.trim(),
        category: dto.category || 'LAPTOP',
      },
    });
  }

  /**
   * 2. GET ALL PRODUCT MODELS (Katalog Induk)
   */
  async findAllModels() {
    return await this.prisma.productModel.findMany({
      include: {
        units: {
          select: {
            id: true,
            status: true,
            hpp: true,
            price: true,
          },
        },
        _count: {
          select: { units: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * 2b. GET SINGLE PRODUCT MODEL WITH ALL PHYSICAL UNITS
   */
  async findModelWithUnits(modelId: string) {
    const model = await this.prisma.productModel.findUnique({
      where: { id: modelId },
      include: {
        units: {
          include: {
            purchaseJournal: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!model) {
      const err: any = new Error(`Katalog Induk dengan ID "${modelId}" tidak ditemukan.`);
      err.status = 404;
      throw err;
    }

    return model;
  }

  /**
   * 3. CREATE PRODUCT UNIT (Penerimaan Unit Fisik dengan Transaksi Prisma)
   */
  async createUnit(dto: CreateProductUnitDto, userContext?: UserContext) {
    const {
      productModelId,
      serialNumber,
      condition,
      grade,
      hpp,
      price,
      isFisikNormal = true,
      isMesinNormal = true,
      isStorageNormal = true,
      isSuhuNormal = true,
      isKeyboardNormal = true,
      isTouchpadNormal = true,
      isPortNormal = true,
      isWebcamNormal = true,
      catatanFisik,
      paymentAccountCode = '110',
    } = dto;

    const normalizedSn = serialNumber.trim().toUpperCase();

    // Check duplicate SN
    const existingUnit = await this.prisma.productUnit.findUnique({
      where: { serialNumber: normalizedSn },
    });

    if (existingUnit) {
      const error: any = new Error(
        `Unit dengan Serial Number (SN) "${normalizedSn}" sudah terdaftar di sistem!`
      );
      error.status = 409;
      throw error;
    }

    // Verify Model existence
    const model = await this.prisma.productModel.findUnique({
      where: { id: productModelId },
    });

    if (!model) {
      const error: any = new Error(
        `Katalog Induk (ProductModel) dengan ID "${productModelId}" tidak ditemukan!`
      );
      error.status = 404;
      throw error;
    }

    const isNew = condition === 'NEW';
    const finalGrade = isNew ? null : (grade || 'B');

    // Execute Prisma Transaction: Insert ProductUnit & Draft Journal RESTOCK
    return await this.prisma.$transaction(async (tx) => {
      // Create Draft RESTOCK Journal Entry
      const purchaseJournal = await tx.journalEntry.create({
        data: {
          keterangan: `Restock Unit Fisik ${model.name} (SN: ${normalizedSn})`,
          sourceType: 'RESTOCK',
          status: 'DRAFT',
          total: hpp,
          createdBy: userContext?.id || null,
          lines: {
            create: [
              {
                accountCode: '130', // Persediaan Barang
                side: 'DEBIT',
                nominal: hpp,
              },
              {
                accountCode: paymentAccountCode, // Kas Toko (110) / Bank
                side: 'KREDIT',
                nominal: hpp,
              },
            ],
          },
        },
      });

      // Insert ProductUnit with status 'QC_PENDING'
      const unit = await tx.productUnit.create({
        data: {
          serialNumber: normalizedSn,
          productModelId: model.id,
          condition: isNew ? 'NEW' : 'SECOND',
          grade: finalGrade,
          hpp,
          price,
          status: 'QC_PENDING',
          createdBy: userContext?.id || null,
          isFisikNormal: isNew ? true : isFisikNormal,
          isMesinNormal: isNew ? true : isMesinNormal,
          isStorageNormal: isNew ? true : isStorageNormal,
          isSuhuNormal: isNew ? true : isSuhuNormal,
          isKeyboardNormal: isNew ? true : isKeyboardNormal,
          isTouchpadNormal: isNew ? true : isTouchpadNormal,
          isPortNormal: isNew ? true : isPortNormal,
          isWebcamNormal: isNew ? true : isWebcamNormal,
          catatanFisik: isNew ? null : catatanFisik,
          purchaseJournalId: purchaseJournal.id,
        },
        include: {
          productModel: true,
          purchaseJournal: true,
        },
      });

      return unit;
    });
  }

  /**
   * 4. GET ALL PRODUCT UNITS
   */
  async findAllUnits(params: { status?: string; search?: string; grade?: string; role?: string }) {
    const { status, search, grade, role } = params;

    const whereClause: any = {};

    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    if (grade && grade !== 'ALL') {
      whereClause.grade = grade;
    }

    if (search) {
      whereClause.OR = [
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { catatanFisik: { contains: search, mode: 'insensitive' } },
        { productModel: { name: { contains: search, mode: 'insensitive' } } },
        { productModel: { sku: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const units = await this.prisma.productUnit.findMany({
      where: whereClause,
      include: {
        productModel: true,
        purchaseJournal: {
          select: {
            id: true,
            status: true,
            keterangan: true,
            total: true,
            tanggal: true,
            lines: {
              select: {
                id: true,
                accountCode: true,
                side: true,
                nominal: true,
                account: {
                  select: { code: true, name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (role === 'KASIR') {
      // Kasir tidak boleh melihat nominal HPP dan jurnal pembelian modal
      return units.map((u) => ({
        ...u,
        hpp: null,
        purchaseJournal: null,
      }));
    }

    return units;
  }

  /**
   * 5. GET SINGLE PRODUCT UNIT BY ID OR SN
   */
  async findOneUnit(idOrSn: string) {
    const unit = await this.prisma.productUnit.findFirst({
      where: {
        OR: [{ id: idOrSn }, { serialNumber: idOrSn }],
      },
      include: {
        productModel: true,
        purchaseJournal: {
          include: {
            lines: {
              include: { account: true },
            },
          },
        },
        transactions: true,
      },
    });

    if (!unit) {
      const error: any = new Error(`Product unit dengan ID/SN "${idOrSn}" tidak ditemukan!`);
      error.status = 404;
      throw error;
    }

    return unit;
  }

  /**
   * 6. APPROVE PRODUCT UNIT (Owner Checker Otorisasi)
   */
  async approveUnit(unitId: string, userContext?: UserContext) {
    const unit = await this.prisma.productUnit.findUnique({
      where: { id: unitId },
      include: { purchaseJournal: true },
    });

    if (!unit) {
      const error: any = new Error(`Unit dengan ID "${unitId}" tidak ditemukan.`);
      error.status = 404;
      throw error;
    }

    if (unit.status !== 'QC_PENDING') {
      const error: any = new Error(`Unit ${unit.serialNumber} sudah diproses / disetujui sebelumnya!`);
      error.status = 400;
      throw error;
    }

    const allQcPassed =
      unit.isFisikNormal &&
      unit.isMesinNormal &&
      unit.isStorageNormal &&
      unit.isSuhuNormal &&
      unit.isKeyboardNormal &&
      unit.isTouchpadNormal &&
      unit.isPortNormal &&
      unit.isWebcamNormal;

    const nextStatus = allQcPassed ? 'AVAILABLE' : 'IN_REPAIR';

    return await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      if (unit.purchaseJournalId) {
        await tx.journalEntry.update({
          where: { id: unit.purchaseJournalId },
          data: {
            status: 'POSTED',
            approvedBy: userContext?.id || null,
            approvedAt: now,
          },
        });
      }

      return await tx.productUnit.update({
        where: { id: unitId },
        data: {
          status: nextStatus,
          approvedBy: userContext?.id || null,
          approvedAt: now,
        },
        include: {
          productModel: true,
          purchaseJournal: true,
        },
      });
    });
  }

  /**
   * 7. REJECT PRODUCT UNIT (Owner Reject)
   */
  async rejectUnit(unitId: string, reason?: string) {
    const unit = await this.prisma.productUnit.findUnique({
      where: { id: unitId },
      include: { purchaseJournal: true },
    });

    if (!unit) {
      const error: any = new Error(`Unit dengan ID "${unitId}" tidak ditemukan.`);
      error.status = 404;
      throw error;
    }

    if (unit.status !== 'QC_PENDING') {
      const error: any = new Error(`Unit ${unit.serialNumber} tidak dapat ditolak karena status sudah ${unit.status}!`);
      error.status = 400;
      throw error;
    }

    return await this.prisma.$transaction(async (tx) => {
      await tx.productUnit.delete({
        where: { id: unitId },
      });

      if (unit.purchaseJournalId) {
        await tx.journalEntry.delete({
          where: { id: unit.purchaseJournalId },
        });
      }

      return {
        message: `Unit ${unit.serialNumber} berhasil ditolak & draf jurnal dihapus. ALASAN: ${reason || 'Inspeksi QC Ditolak Owner'}`,
      };
    });
  }

  /**
   * 8. UPDATE / UPGRADE PRODUCT UNIT (Capitalization & Repair)
   */
  async upgradeUnit(unitId: string, dto: UpdateProductUnitDto) {
    const unit = await this.prisma.productUnit.findUnique({
      where: { id: unitId },
      include: { productModel: true, purchaseJournal: { include: { lines: true } } },
    });

    if (!unit) {
      const error: any = new Error(`Unit dengan ID "${unitId}" tidak ditemukan.`);
      error.status = 404;
      throw error;
    }

    const { addedHppCost = 0, grade, status, price, hpp, serialNumber, condition } = dto;

    if (serialNumber && serialNumber.trim().toUpperCase() !== unit.serialNumber) {
      const normalizedSn = serialNumber.trim().toUpperCase();
      const existing = await this.prisma.productUnit.findUnique({
        where: { serialNumber: normalizedSn },
      });
      if (existing) {
        const error: any = new Error(`Serial Number ${normalizedSn} sudah terdaftar pada unit lain.`);
        error.status = 400;
        throw error;
      }
    }

    return await this.prisma.$transaction(async (tx) => {
      let newHpp = Number(unit.hpp);

      if (addedHppCost > 0) {
        newHpp += addedHppCost;

        await tx.journalEntry.create({
          data: {
            keterangan: `Kapitalisasi Upgrade Unit ${unit.productModel.name} (SN: ${unit.serialNumber})`,
            sourceType: 'SERVICE',
            status: 'POSTED',
            total: addedHppCost,
            lines: {
              create: [
                { accountCode: '130', side: 'DEBIT', nominal: addedHppCost },
                { accountCode: '110', side: 'KREDIT', nominal: addedHppCost },
              ],
            },
          },
        });
      } else if (hpp !== undefined) {
        newHpp = hpp;
      }

      // Jika ada perubahan HPP atau keterangan/akun pembelian dan ada purchaseJournalId, sinkronkan jurnal pembelian
      if (unit.purchaseJournalId && (hpp !== undefined || dto.purchaseKeterangan || dto.paymentAccountCode)) {
        await tx.journalEntry.update({
          where: { id: unit.purchaseJournalId },
          data: {
            ...(hpp !== undefined ? { total: newHpp } : {}),
            ...(dto.purchaseKeterangan ? { keterangan: dto.purchaseKeterangan } : {}),
          },
        });

        if (hpp !== undefined || dto.paymentAccountCode) {
          const lines = await tx.journalLine.findMany({
            where: { entryId: unit.purchaseJournalId },
          });

          for (const line of lines) {
            if (line.side === 'DEBIT') {
              await tx.journalLine.update({
                where: { id: line.id },
                data: { nominal: newHpp },
              });
            } else if (line.side === 'KREDIT') {
              await tx.journalLine.update({
                where: { id: line.id },
                data: {
                  nominal: newHpp,
                  ...(dto.paymentAccountCode ? { accountCode: dto.paymentAccountCode } : {}),
                },
              });
            }
          }
        }
      }

      return await tx.productUnit.update({
        where: { id: unitId },
        data: {
          hpp: newHpp,
          ...(serialNumber ? { serialNumber: serialNumber.trim().toUpperCase() } : {}),
          ...(condition ? { condition } : {}),
          ...(price !== undefined ? { price } : {}),
          ...(grade !== undefined ? { grade } : {}),
          ...(status ? { status } : {}),
          ...(dto.isFisikNormal !== undefined ? { isFisikNormal: dto.isFisikNormal } : {}),
          ...(dto.isMesinNormal !== undefined ? { isMesinNormal: dto.isMesinNormal } : {}),
          ...(dto.isStorageNormal !== undefined ? { isStorageNormal: dto.isStorageNormal } : {}),
          ...(dto.isSuhuNormal !== undefined ? { isSuhuNormal: dto.isSuhuNormal } : {}),
          ...(dto.isKeyboardNormal !== undefined ? { isKeyboardNormal: dto.isKeyboardNormal } : {}),
          ...(dto.isTouchpadNormal !== undefined ? { isTouchpadNormal: dto.isTouchpadNormal } : {}),
          ...(dto.isPortNormal !== undefined ? { isPortNormal: dto.isPortNormal } : {}),
          ...(dto.isWebcamNormal !== undefined ? { isWebcamNormal: dto.isWebcamNormal } : {}),
          ...(dto.catatanFisik !== undefined ? { catatanFisik: dto.catatanFisik } : {}),
        },
        include: {
          productModel: true,
          purchaseJournal: {
            include: {
              lines: {
                include: { account: true },
              },
            },
          },
        },
      });
    });
  }

  /**
   * 8b. UPDATE PURCHASE RECORD & JOURNAL (Finance & Owner Edit Riwayat Pembelian)
   */
  async updatePurchase(
    id: string,
    dto: {
      hpp?: number;
      keterangan?: string;
      paymentAccountCode?: string;
      tanggal?: string;
    }
  ) {
    // Cari unit berdasarkan id atau purchaseJournalId
    const unit = await this.prisma.productUnit.findFirst({
      where: {
        OR: [{ id }, { purchaseJournalId: id }],
      },
      include: {
        purchaseJournal: {
          include: { lines: true },
        },
      },
    });

    if (!unit || !unit.purchaseJournal) {
      const error: any = new Error('Data riwayat pembelian tidak ditemukan.');
      error.status = 404;
      throw error;
    }

    const finalHpp = dto.hpp !== undefined ? dto.hpp : Number(unit.hpp);

    return await this.prisma.$transaction(async (tx) => {
      // 1. Update Unit HPP
      const updatedUnit = await tx.productUnit.update({
        where: { id: unit.id },
        data: { hpp: finalHpp },
        include: { productModel: true },
      });

      // 2. Update Journal Entry
      const updatedJournal = await tx.journalEntry.update({
        where: { id: unit.purchaseJournal!.id },
        data: {
          total: finalHpp,
          ...(dto.keterangan ? { keterangan: dto.keterangan } : {}),
          ...(dto.tanggal ? { tanggal: new Date(dto.tanggal) } : {}),
          isEdited: true,
        },
      });

      // 3. Update Journal Lines (Debit: 130 Persediaan, Kredit: paymentAccountCode)
      const lines = unit.purchaseJournal!.lines;
      for (const line of lines) {
        if (line.side === 'DEBIT') {
          await tx.journalLine.update({
            where: { id: line.id },
            data: { nominal: finalHpp },
          });
        } else {
          await tx.journalLine.update({
            where: { id: line.id },
            data: {
              nominal: finalHpp,
              ...(dto.paymentAccountCode ? { accountCode: dto.paymentAccountCode } : {}),
            },
          });
        }
      }

      return {
        message: 'Riwayat pembelian berhasil diperbarui.',
        unit: updatedUnit,
        journal: updatedJournal,
      };
    });
  }


}
