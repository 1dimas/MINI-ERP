import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type HealthStatus = 'HEALTHY' | 'ERROR';

export interface HealthCheckItem {
  id: string;
  indicator: string;
  status: HealthStatus;
  message: string;
  details?: Record<string, any>;
}

export interface SystemHealthReport {
  timestamp: string;
  isAllHealthy: boolean;
  checks: HealthCheckItem[];
}

@Injectable()
export class SystemService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /system/health
   * Diagnostik integritas data otomatis untuk role OWNER (Eksekusi Paralel)
   */
  async getHealthCheck(): Promise<SystemHealthReport> {
    const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);

    // Eksekusi seluruh kueri diagnostik secara paralel via Promise.all
    const [
      physicalUnits,
      account130Lines,
      postedLinesGroupBy,
      ghostTransactionsCount,
      staleQcUnits,
    ] = await Promise.all([
      // 1A. Unit fisik AVAILABLE & IN_REPAIR
      this.prisma.productUnit.findMany({
        where: {
          status: { in: ['AVAILABLE', 'IN_REPAIR'] },
        },
        select: { id: true, serialNumber: true, hpp: true, status: true },
      }),

      // 1B. Saldo Buku Besar Akun 130 (Persediaan Barang) dari Jurnal POSTED
      this.prisma.journalLine.findMany({
        where: {
          accountCode: '130',
          entry: { status: 'POSTED' },
        },
        select: { side: true, nominal: true },
      }),

      // 2. Keseimbangan Jurnal Mutlak (Debit vs Kredit) untuk seluruh jurnal POSTED
      this.prisma.journalLine.groupBy({
        by: ['side'],
        _sum: { nominal: true },
        where: {
          entry: { status: 'POSTED' },
        },
      }),

      // 3. Transaksi Kasir Hantu (SUCCESS tapi tanpa journalEntryId)
      this.prisma.posTransaction.count({
        where: {
          status: 'SUCCESS',
          journalEntryId: null,
        },
      }),

      // 4. Unit Nyangkut di QC (QC_PENDING > 72 jam)
      this.prisma.productUnit.findMany({
        where: {
          status: 'QC_PENDING',
          createdAt: { lte: seventyTwoHoursAgo },
        },
        select: { id: true, serialNumber: true, createdAt: true },
      }),
    ]);

    // Format Rupiah Helper
    const formatRp = (num: number) =>
      `Rp ${Math.round(num).toLocaleString('id-ID')}`;

    // --- CEK 1: Integritas HPP vs Buku Besar Persediaan (Akun 130) ---
    const totalHppFisik = physicalUnits.reduce(
      (sum, u) => sum + Number(u.hpp),
      0
    );

    let saldoBuku130 = 0;
    for (const line of account130Lines) {
      const nom = Number(line.nominal);
      saldoBuku130 += line.side === 'DEBIT' ? nom : -nom;
    }
    saldoBuku130 = Number(saldoBuku130.toFixed(2));

    const diffHpp = Math.abs(totalHppFisik - saldoBuku130);
    const isHppHealthy = diffHpp < 0.01;

    const check1: HealthCheckItem = {
      id: 'inventory-ledger-integrity',
      indicator: 'Integritas HPP Fisik vs Buku Besar (Akun 130)',
      status: isHppHealthy ? 'HEALTHY' : 'ERROR',
      message: isHppHealthy
        ? `Sinkron sempurna! Total HPP unit siap jual (${physicalUnits.length} unit) senilai ${formatRp(totalHppFisik)} sama persis dengan saldo buku besar persediaan.`
        : `Ada selisih ${formatRp(diffHpp)} antara HPP fisik (${formatRp(totalHppFisik)}) dan saldo buku besar persediaan (${formatRp(saldoBuku130)})!`,
      details: {
        totalUnits: physicalUnits.length,
        totalHppFisik,
        saldoBukuPersediaan: saldoBuku130,
        selisih: diffHpp,
      },
    };

    // --- CEK 2: Keseimbangan Jurnal Mutlak (Total Debit == Total Kredit) ---
    let totalDebit = 0;
    let totalKredit = 0;

    for (const item of postedLinesGroupBy) {
      const val = Number(item._sum.nominal || 0);
      if (item.side === 'DEBIT') totalDebit += val;
      if (item.side === 'KREDIT') totalKredit += val;
    }
    totalDebit = Number(totalDebit.toFixed(2));
    totalKredit = Number(totalKredit.toFixed(2));

    const diffJournal = Math.abs(totalDebit - totalKredit);
    const isJournalBalanced = diffJournal < 0.01;

    const check2: HealthCheckItem = {
      id: 'double-entry-balance',
      indicator: 'Keseimbangan Jurnal Mutlak (Double-Entry Balance)',
      status: isJournalBalanced ? 'HEALTHY' : 'ERROR',
      message: isJournalBalanced
        ? `Jurnal Umum seimbang 100%! Total Debit (${formatRp(totalDebit)}) dan Total Kredit (${formatRp(totalKredit)}) bernilai sama.`
        : `Jurnal Umum tidak seimbang (Unbalanced)! Ditemukan selisih debit-kredit sebesar ${formatRp(diffJournal)}. Total Debit: ${formatRp(totalDebit)}, Total Kredit: ${formatRp(totalKredit)}.`,
      details: {
        totalDebit,
        totalKredit,
        selisih: diffJournal,
      },
    };

    // --- CEK 3: Transaksi Kasir Hantu (Ghost Transactions) ---
    const isGhostHealthy = ghostTransactionsCount === 0;

    const check3: HealthCheckItem = {
      id: 'ghost-pos-transactions',
      indicator: 'Integritas Transaksi Kasir (Anti-Ghost Transaction)',
      status: isGhostHealthy ? 'HEALTHY' : 'ERROR',
      message: isGhostHealthy
        ? 'Bersih! Seluruh transaksi kasir yang sukses memiliki jurnal akuntansi terkait (0 transaksi hantu).'
        : `Ditemukan ${ghostTransactionsCount} transaksi kasir berstatus SUCCESS tanpa jurnal akuntansi! Segera periksa integritas database.`,
      details: {
        ghostCount: ghostTransactionsCount,
      },
    };

    // --- CEK 4: Barang Nyangkut di QC (> 72 Jam) ---
    const isQcHealthy = staleQcUnits.length === 0;

    const check4: HealthCheckItem = {
      id: 'stale-qc-units',
      indicator: 'Kelancaran Alur QC Barang Masuk (> 72 Jam)',
      status: isQcHealthy ? 'HEALTHY' : 'ERROR',
      message: isQcHealthy
        ? 'Lancar! Tidak ada barang masuk yang tertahan di status QC_PENDING lebih dari 3 hari.'
        : `Perhatian: Ditemukan ${staleQcUnits.length} unit laptop tertahan di QC_PENDING lebih dari 3 hari (${staleQcUnits.map((u) => u.serialNumber).slice(0, 3).join(', ')}${staleQcUnits.length > 3 ? '...' : ''}). Segera lakukan inspeksi Owner!`,
      details: {
        staleUnitsCount: staleQcUnits.length,
        units: staleQcUnits,
      },
    };

    const checks = [check1, check2, check3, check4];
    const isAllHealthy = checks.every((c) => c.status === 'HEALTHY');

    return {
      timestamp: new Date().toISOString(),
      isAllHealthy,
      checks,
    };
  }
}
