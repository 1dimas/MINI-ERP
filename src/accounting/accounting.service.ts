import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DateFilterDto } from './dto/date-filter.dto';

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  private buildDateFilter(startDate?: string, endDate?: string) {
    const filter: any = {};
    if (startDate) {
      filter.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.lte = end;
    }
    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  /**
   * 1. GET /accounting/ledger/:accountCode (Buku Besar)
   * UPDATE KRUSIAL: HANYA menghitung dari jurnal yang berstatus 'POSTED'
   */
  async getLedger(accountCode: string, filterDto: DateFilterDto) {
    const account = await this.prisma.chartOfAccount.findUnique({
      where: { code: accountCode },
    });

    if (!account) {
      throw new NotFoundException(
        `Akun dengan kode '${accountCode}' tidak ditemukan.`,
      );
    }

    const dateFilter = this.buildDateFilter(
      filterDto.startDate,
      filterDto.endDate,
    );

    const lines = await this.prisma.journalLine.findMany({
      where: {
        accountCode,
        entry: {
          status: 'POSTED', // UPDATE KRUSIAL: Abaikan yang DRAFT
          ...(dateFilter ? { tanggal: dateFilter } : {}),
        },
      },
      include: {
        entry: {
          select: {
            id: true,
            tanggal: true,
            keterangan: true,
            sourceType: true,
            sourceId: true,
            status: true,
          },
        },
      },
      orderBy: {
        entry: {
          tanggal: 'asc',
        },
      },
    });

    let startingBalance = 0;
    if (filterDto.startDate) {
      const priorLines = await this.prisma.journalLine.findMany({
        where: {
          accountCode,
          entry: {
            status: 'POSTED',
            tanggal: { lt: new Date(filterDto.startDate) },
          },
        },
      });
      for (const line of priorLines) {
        const nominal = Number(line.nominal);
        if (account.normalBalance === 'DEBIT') {
          startingBalance += line.side === 'DEBIT' ? nominal : -nominal;
        } else {
          startingBalance += line.side === 'KREDIT' ? nominal : -nominal;
        }
      }
    }

    let runningBalance = startingBalance;
    let totalDebit = 0;
    let totalKredit = 0;

    const formattedTransactions = lines.map((line) => {
      const nominal = Number(line.nominal);
      const isDebit = line.side === 'DEBIT';
      const isCredit = line.side === 'KREDIT';

      if (isDebit) totalDebit += nominal;
      if (isCredit) totalKredit += nominal;

      // Logic Running Balance sesuai normalBalance
      if (account.normalBalance === 'DEBIT') {
        runningBalance += isDebit ? nominal : -nominal;
      } else {
        runningBalance += isCredit ? nominal : -nominal;
      }

      return {
        lineId: line.id,
        entryId: line.entry.id,
        tanggal: line.entry.tanggal,
        keterangan: line.entry.keterangan,
        sourceType: line.entry.sourceType,
        sourceId: line.entry.sourceId,
        status: line.entry.status,
        side: line.side,
        debit: isDebit ? nominal : 0,
        kredit: isCredit ? nominal : 0,
        runningBalance: Number(runningBalance.toFixed(2)),
      };
    });

    return {
      account: {
        code: account.code,
        name: account.name,
        type: account.type,
        normalBalance: account.normalBalance,
      },
      startingBalance: Number(startingBalance.toFixed(2)),
      totalDebit: Number(totalDebit.toFixed(2)),
      totalKredit: Number(totalKredit.toFixed(2)),
      endingBalance: Number(runningBalance.toFixed(2)),
      totalTransactions: formattedTransactions.length,
      transactions: formattedTransactions,
    };
  }

  /**
   * 2. GET /accounting/trial-balance (Neraca Saldo)
   * UPDATE KRUSIAL: HANYA menghitung dari jurnal yang berstatus 'POSTED'
   * Mendukung saldo awal (carry-forward) untuk akun Aset, Kewajiban, Ekuitas
   */
  async getTrialBalance(filterDto: DateFilterDto) {
    const dateFilter = this.buildDateFilter(
      filterDto.startDate,
      filterDto.endDate,
    );

    const accounts = await this.prisma.chartOfAccount.findMany({
      orderBy: { code: 'asc' },
    });

    // Agregasi saldo awal sebelum startDate untuk akun Neraca (ASET, KEWAJIBAN, EKUITAS)
    const priorSumsMap = new Map<string, { debit: number; kredit: number }>();
    if (filterDto.startDate) {
      const priorLines = await this.prisma.journalLine.groupBy({
        by: ['accountCode', 'side'],
        _sum: { nominal: true },
        where: {
          entry: {
            status: 'POSTED',
            tanggal: { lt: new Date(filterDto.startDate) },
          },
        },
      });
      for (const item of priorLines) {
        const cur = priorSumsMap.get(item.accountCode) || { debit: 0, kredit: 0 };
        const amt = Number(item._sum.nominal || 0);
        if (item.side === 'DEBIT') cur.debit += amt;
        else if (item.side === 'KREDIT') cur.kredit += amt;
        priorSumsMap.set(item.accountCode, cur);
      }
    }

    // Efficient aggregate query per account periode ini - HANYA STATUS POSTED
    const journalLines = await this.prisma.journalLine.groupBy({
      by: ['accountCode', 'side'],
      _sum: {
        nominal: true,
      },
      where: {
        entry: {
          status: 'POSTED',
          ...(dateFilter ? { tanggal: dateFilter } : {}),
        },
      },
    });

    const sumsMap = new Map<string, { debit: number; kredit: number }>();
    for (const item of journalLines) {
      const current = sumsMap.get(item.accountCode) || { debit: 0, kredit: 0 };
      const amount = Number(item._sum.nominal || 0);
      if (item.side === 'DEBIT') {
        current.debit += amount;
      } else if (item.side === 'KREDIT') {
        current.kredit += amount;
      }
      sumsMap.set(item.accountCode, current);
    }

    let totalDebitAll = 0;
    let totalKreditAll = 0;

    const resultAccounts = accounts.map((account) => {
      const sums = sumsMap.get(account.code) || { debit: 0, kredit: 0 };
      const debit = Number(sums.debit.toFixed(2));
      const kredit = Number(sums.kredit.toFixed(2));

      totalDebitAll += debit;
      totalKreditAll += kredit;

      // Hitung Saldo Awal untuk akun Neraca
      let startingBalance = 0;
      const isBalanceSheetAccount = ['ASET', 'KEWAJIBAN', 'EKUITAS'].includes(account.type);
      if (isBalanceSheetAccount && filterDto.startDate) {
        const prior = priorSumsMap.get(account.code) || { debit: 0, kredit: 0 };
        if (account.normalBalance === 'DEBIT') {
          startingBalance = prior.debit - prior.kredit;
        } else {
          startingBalance = prior.kredit - prior.debit;
        }
      }

      let endingBalance = startingBalance;
      if (account.normalBalance === 'DEBIT') {
        endingBalance += debit - kredit;
      } else {
        endingBalance += kredit - debit;
      }

      return {
        code: account.code,
        name: account.name,
        type: account.type,
        normalBalance: account.normalBalance,
        startingBalance: Number(startingBalance.toFixed(2)),
        debit,
        kredit,
        endingBalance: Number(endingBalance.toFixed(2)),
      };
    });

    const grandTotalDebit = Number(totalDebitAll.toFixed(2));
    const grandTotalKredit = Number(totalKreditAll.toFixed(2));
    const isBalanced = Math.abs(grandTotalDebit - grandTotalKredit) < 0.001;

    return {
      period: {
        startDate: filterDto.startDate || null,
        endDate: filterDto.endDate || null,
      },
      accounts: resultAccounts,
      summary: {
        totalDebit: grandTotalDebit,
        totalKredit: grandTotalKredit,
        isBalanced,
      },
    };
  }

  /**
   * 3. GET /accounting/profit-loss (Laba Rugi)
   * UPDATE KRUSIAL: HANYA menghitung dari jurnal yang berstatus 'POSTED'
   */
  async getProfitLoss(filterDto: DateFilterDto) {
    const dateFilter = this.buildDateFilter(
      filterDto.startDate,
      filterDto.endDate,
    );

    const accounts = await this.prisma.chartOfAccount.findMany({
      where: {
        type: {
          in: ['PENDAPATAN', 'BEBAN'],
        },
      },
      orderBy: { code: 'asc' },
    });

    const journalLines = await this.prisma.journalLine.groupBy({
      by: ['accountCode', 'side'],
      _sum: {
        nominal: true,
      },
      where: {
        entry: {
          status: 'POSTED', // UPDATE KRUSIAL: Abaikan DRAFT
          ...(dateFilter ? { tanggal: dateFilter } : {}),
        },
      },
    });

    const sumsMap = new Map<string, { debit: number; kredit: number }>();
    for (const item of journalLines) {
      const current = sumsMap.get(item.accountCode) || { debit: 0, kredit: 0 };
      const amount = Number(item._sum.nominal || 0);
      if (item.side === 'DEBIT') {
        current.debit += amount;
      } else if (item.side === 'KREDIT') {
        current.kredit += amount;
      }
      sumsMap.set(item.accountCode, current);
    }

    let totalPendapatan = 0;
    let totalHpp = 0;
    let totalBebanOperasional = 0;

    const pendapatanAccounts: any[] = [];
    const hppAccounts: any[] = [];
    const bebanAccounts: any[] = [];

    for (const account of accounts) {
      const sums = sumsMap.get(account.code) || { debit: 0, kredit: 0 };
      const debit = Number(sums.debit.toFixed(2));
      const kredit = Number(sums.kredit.toFixed(2));

      if (account.type === 'PENDAPATAN') {
        const saldo = kredit - debit;
        totalPendapatan += saldo;
        pendapatanAccounts.push({
          code: account.code,
          name: account.name,
          total: Number(saldo.toFixed(2)),
        });
      } else if (account.type === 'BEBAN') {
        const saldo = debit - kredit;
        const isHpp =
          account.code.startsWith('440') ||
          account.name.toUpperCase().includes('HPP');

        if (isHpp) {
          totalHpp += saldo;
          hppAccounts.push({
            code: account.code,
            name: account.name,
            total: Number(saldo.toFixed(2)),
          });
        } else {
          totalBebanOperasional += saldo;
          bebanAccounts.push({
            code: account.code,
            name: account.name,
            total: Number(saldo.toFixed(2)),
          });
        }
      }
    }

    const labaKotor = totalPendapatan - totalHpp;
    const labaBersih = labaKotor - totalBebanOperasional;

    return {
      period: {
        startDate: filterDto.startDate || null,
        endDate: filterDto.endDate || null,
      },
      summary: {
        totalPendapatan: Number(totalPendapatan.toFixed(2)),
        totalHpp: Number(totalHpp.toFixed(2)),
        labaKotor: Number(labaKotor.toFixed(2)),
        totalBebanOperasional: Number(totalBebanOperasional.toFixed(2)),
        labaBersih: Number(labaBersih.toFixed(2)),
      },
      details: {
        pendapatan: pendapatanAccounts,
        hpp: hppAccounts,
        bebanOperasional: bebanAccounts,
      },
    };
  }
}
