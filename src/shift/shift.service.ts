import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';

@Injectable()
export class ShiftService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * POST /shift/open
   * Buka shift kasir dengan modal awal di laci.
   * Kasir hanya boleh memiliki 1 shift berstatus 'OPEN'.
   */
  async openShift(dto: OpenShiftDto, user: { id: string; name?: string; role: string }) {
    const existing = await this.prisma.cashierShift.findFirst({
      where: {
        userId: user.id,
        status: 'OPEN',
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Kasir masih memiliki shift aktif yang belum ditutup. Harap tutup shift sebelumnya terlebih dahulu.',
      );
    }

    const shift = await this.prisma.cashierShift.create({
      data: {
        userId: user.id,
        startingCash: dto.startingCash,
        status: 'OPEN',
      },
    });

    return {
      success: true,
      message: `Shift kasir berhasil dibuka dengan modal awal Rp ${Number(dto.startingCash).toLocaleString('id-ID')}`,
      shift,
    };
  }

  /**
   * GET /shift/current
   * Mengambil shift 'OPEN' milik kasir yang sedang login.
   * Menghitung total transaksi CASH berstatus SUCCESS yang terikat pada shift ini.
   * expectedEndingCash = startingCash + totalPenjualanCash
   */
  async getCurrentShift(userId: string) {
    const shift = await this.prisma.cashierShift.findFirst({
      where: {
        userId,
        status: 'OPEN',
      },
      include: {
        transactions: {
          where: {
            paymentMethod: 'CASH',
            status: 'SUCCESS',
          },
        },
      },
    });

    if (!shift) {
      return {
        active: false,
        shift: null,
      };
    }

    const startingCash = Number(shift.startingCash);
    const totalPenjualanCash = shift.transactions.reduce(
      (sum, t) => sum + Number(t.totalPrice),
      0,
    );
    const expectedEndingCash = startingCash + totalPenjualanCash;

    return {
      active: true,
      shift: {
        id: shift.id,
        userId: shift.userId,
        startTime: shift.startTime,
        startingCash,
        totalPenjualanCash,
        cashTransactionsCount: shift.transactions.length,
        expectedEndingCash,
        status: shift.status,
      },
    };
  }

  /**
   * POST /shift/close
   * Tutup shift kasir dengan memasukkan uang fisik yang dihitung di laci (actualEndingCash).
   * Menghitung selisih dan otomatis menerbitkan JournalEntry berstatus POSTED:
   * - Shortage (selisih < 0): DEBIT '530' (Beban Selisih Kas), KREDIT '110' (Kas Toko)
   * - Overage (selisih > 0): DEBIT '110' (Kas Toko), KREDIT '410' (Penjualan POS / Pendapatan)
   */
  async closeShift(
    dto: CloseShiftDto,
    user: { id: string; name?: string; role: string },
  ) {
    const shift = await this.prisma.cashierShift.findFirst({
      where: {
        userId: user.id,
        status: 'OPEN',
      },
      include: {
        transactions: {
          where: {
            paymentMethod: 'CASH',
            status: 'SUCCESS',
          },
        },
      },
    });

    if (!shift) {
      throw new BadRequestException('Tidak ada shift kasir aktif yang dapat ditutup.');
    }

    return this.prisma.$transaction(async (tx) => {
      const startingCash = Number(shift.startingCash);
      const totalPenjualanCash = shift.transactions.reduce(
        (sum, t) => sum + Number(t.totalPrice),
        0,
      );
      const expectedEndingCash = startingCash + totalPenjualanCash;
      const actualEndingCash = Number(dto.actualEndingCash);
      const selisih = actualEndingCash - expectedEndingCash;

      // 1. Update status shift jadi CLOSED
      const updatedShift = await tx.cashierShift.update({
        where: { id: shift.id },
        data: {
          endTime: new Date(),
          expectedEndingCash,
          actualEndingCash,
          status: 'CLOSED',
        },
      });

      // 2. Pastikan akun 530 (Beban Selisih Kas) terdaftar di Bagan Akun (COA)
      await tx.chartOfAccount.upsert({
        where: { code: '530' },
        update: {},
        create: {
          code: '530',
          name: 'Beban Selisih Kas',
          type: 'BEBAN',
          normalBalance: 'DEBIT',
          isProtected: true,
        },
      });

      let differenceJournal = null;

      // 3. Auto-Journal Selisih Kas
      if (selisih < 0) {
        // Uang kurang / Shortage: DEBIT 530, KREDIT 110
        const deficitAmount = Math.abs(selisih);
        differenceJournal = await tx.journalEntry.create({
          data: {
            tanggal: new Date(),
            keterangan: `Selisih Kas Kurang (Shortage) Shift Kasir - ${user.name || 'Kasir'} [${shift.id.slice(0, 8)}]`,
            sourceType: 'CASHFLOW',
            sourceId: shift.id,
            status: 'POSTED',
            total: deficitAmount,
            lines: {
              create: [
                {
                  accountCode: '530', // Beban Selisih Kas
                  side: 'DEBIT',
                  nominal: deficitAmount,
                },
                {
                  accountCode: '110', // Kas Toko
                  side: 'KREDIT',
                  nominal: deficitAmount,
                },
              ],
            },
          },
          include: { lines: true },
        });
      } else if (selisih > 0) {
        // Uang lebih / Overage: DEBIT 110, KREDIT 410
        differenceJournal = await tx.journalEntry.create({
          data: {
            tanggal: new Date(),
            keterangan: `Selisih Kas Lebih (Overage) Shift Kasir - ${user.name || 'Kasir'} [${shift.id.slice(0, 8)}]`,
            sourceType: 'CASHFLOW',
            sourceId: shift.id,
            status: 'POSTED',
            total: selisih,
            lines: {
              create: [
                {
                  accountCode: '110', // Kas Toko
                  side: 'DEBIT',
                  nominal: selisih,
                },
                {
                  accountCode: '410', // Pendapatan Toko
                  side: 'KREDIT',
                  nominal: selisih,
                },
              ],
            },
          },
          include: { lines: true },
        });
      }

      return {
        success: true,
        message: `Shift kasir berhasil ditutup.${
          selisih !== 0
            ? ` Tercatat selisih kas ${selisih < 0 ? 'kurang (Shortage)' : 'lebih (Overage)'}: Rp ${Math.abs(selisih).toLocaleString('id-ID')}`
            : ' Kas fisik seimbang sempurna (100% Match).'
        }`,
        shift: updatedShift,
        settlement: {
          startingCash,
          totalPenjualanCash,
          expectedEndingCash,
          actualEndingCash,
          selisih,
          hasDifference: selisih !== 0,
        },
        differenceJournal,
      };
    });
  }

  /**
   * GET /shift/warnings
   * Khusus role OWNER: Mencari seluruh shift yang status-nya masih 'OPEN'
   * dan startTime-nya lebih dari 14 jam yang lalu (shift gantung).
   */
  async getOverdueShiftWarnings(user?: { role?: string }) {
    if (user?.role && user.role !== 'OWNER') {
      throw new BadRequestException('Hanya role OWNER yang dapat mengakses peringatan shift gantung.');
    }

    const fourteenHoursAgo = new Date(Date.now() - 14 * 60 * 60 * 1000);

    const overdueShifts = await this.prisma.cashierShift.findMany({
      where: {
        status: 'OPEN',
        startTime: {
          lte: fourteenHoursAgo,
        },
      },
      include: {
        transactions: {
          where: { status: 'SUCCESS' },
          select: {
            id: true,
            totalPrice: true,
            paymentMethod: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    if (overdueShifts.length === 0) {
      return [];
    }

    // Ambil detail data user kasir
    const userIds = Array.from(new Set(overdueShifts.map((s) => s.userId)));
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, role: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const now = Date.now();

    return overdueShifts.map((shift) => {
      const kasirUser = userMap.get(shift.userId);
      const elapsedHours = Math.floor(
        (now - new Date(shift.startTime).getTime()) / (1000 * 60 * 60)
      );

      return {
        id: shift.id,
        userId: shift.userId,
        startTime: shift.startTime,
        startingCash: Number(shift.startingCash),
        status: shift.status,
        elapsedHours,
        transactionCount: shift.transactions.length,
        user: kasirUser || {
          id: shift.userId,
          name: 'Kasir (ID: ' + shift.userId.slice(0, 8) + ')',
          email: '-',
          role: 'KASIR',
        },
      };
    });
  }
}
