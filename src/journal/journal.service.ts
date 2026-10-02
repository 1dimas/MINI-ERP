import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JournalFilterDto } from './dto/journal-filter.dto';
import { CreateManualJournalDto } from './dto/create-manual-journal.dto';
import { AuditJournalDto, AuditAction } from './dto/audit-journal.dto';
import { Role } from '../auth/enums/role.enum';

@Injectable()
export class JournalService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /journal: Menampilkan riwayat JournalEntry dengan filter status, sourceType, dan tanggal.
   */
  async findAll(filterDto: JournalFilterDto) {
    const where: any = {};

    if (filterDto.status) {
      where.status = filterDto.status.toUpperCase();
    }

    if (filterDto.sourceType) {
      where.sourceType = filterDto.sourceType.toUpperCase();
    }

    if (filterDto.startDate || filterDto.endDate) {
      where.tanggal = {};
      if (filterDto.startDate) {
        where.tanggal.gte = new Date(filterDto.startDate);
      }
      if (filterDto.endDate) {
        const end = new Date(filterDto.endDate);
        end.setHours(23, 59, 59, 999);
        where.tanggal.lte = end;
      }
    }

    return this.prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: {
            account: {
              select: {
                name: true,
                type: true,
                normalBalance: true,
              },
            },
          },
        },
      },
      orderBy: {
        tanggal: 'desc',
      },
    });
  }

  /**
   * POST /journal/manual: Pembuatan Jurnal Manual Atomik
   * Role FINANCE -> Paksa status DRAFT
   * Role OWNER -> Langsung berstatus POSTED
   */
  async createManual(
    dto: CreateManualJournalDto,
    user: { id: string; role: string },
  ) {
    if (user.role === Role.KASIR) {
      throw new ForbiddenException('Akses ditolak. KASIR tidak diizinkan membuat jurnal manual.');
    }

    if (!dto.lines || dto.lines.length < 2) {
      throw new BadRequestException(
        'Transaksi jurnal manual minimal terdiri dari 2 akun (Debit & Kredit).',
      );
    }

    // Verifikasi keberadaan kode akun di ChartOfAccount
    const accountCodes = Array.from(new Set(dto.lines.map((l) => l.accountCode)));
    const existingAccounts = await this.prisma.chartOfAccount.findMany({
      where: { code: { in: accountCodes } },
    });

    if (existingAccounts.length !== accountCodes.length) {
      throw new BadRequestException(
        'Salah satu kode akun yang dimasukkan tidak terdaftar di Bagan Akun (COA).',
      );
    }

    // Hitung total Debit dan Kredit
    let totalDebit = 0;
    let totalKredit = 0;

    for (const line of dto.lines) {
      if (line.side === 'DEBIT') {
        totalDebit += Number(line.nominal);
      } else if (line.side === 'KREDIT') {
        totalKredit += Number(line.nominal);
      }
    }

    const diff = Math.abs(totalDebit - totalKredit);
    if (diff > 0.001) {
      throw new BadRequestException(
        `Total Debit (${totalDebit}) dan Total Kredit (${totalKredit}) tidak seimbang (Unbalanced).`,
      );
    }

    // System Logic: Jika role FINANCE -> Paksa status 'DRAFT'. Jika OWNER -> 'POSTED'
    const status = user.role === Role.FINANCE ? 'DRAFT' : 'POSTED';
    const transDate = dto.tanggal ? new Date(dto.tanggal) : new Date();

    // Transaksi Atomik (prisma.$transaction)
    return this.prisma.$transaction(async (tx) => {
      return tx.journalEntry.create({
        data: {
          tanggal: transDate,
          keterangan: dto.keterangan,
          sourceType: 'MANUAL',
          status,
          total: totalDebit,
          lines: {
            create: dto.lines.map((line) => ({
              accountCode: line.accountCode,
              side: line.side,
              nominal: line.nominal,
            })),
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
    });
  }

  /**
   * PATCH /journal/audit/:id: Eksekusi Audit (Hanya OWNER)
   * Payload: { "action": "APPROVE" | "REJECT" }
   * Atomik via prisma.$transaction
   */
  async auditStatus(id: string, auditDto: AuditJournalDto) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      throw new NotFoundException(`Jurnal dengan ID '${id}' tidak ditemukan.`);
    }

    if (entry.status !== 'DRAFT') {
      throw new BadRequestException(
        `Jurnal ini sudah berstatus '${entry.status}' dan tidak dapat diaudit ulang.`,
      );
    }

    const newStatus =
      auditDto.action === AuditAction.APPROVE ? 'POSTED' : 'REJECTED';

    // Transaksi Atomik (prisma.$transaction)
    return this.prisma.$transaction(async (tx) => {
      return tx.journalEntry.update({
        where: { id },
        data: { status: newStatus },
        include: {
          lines: {
            include: {
              account: true,
            },
          },
        },
      });
    });
  }
}
