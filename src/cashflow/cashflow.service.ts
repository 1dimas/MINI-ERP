import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCashflowDto, CashflowType } from './dto/create-cashflow.dto';
import { Role } from '../auth/enums/role.enum';

@Injectable()
export class CashflowService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper: Menghitung Saldo Berjalan POSTED dari Suatu Akun
   */
  async getAccountPostedBalance(accountCode: string): Promise<number> {
    const account = await this.prisma.chartOfAccount.findUnique({
      where: { code: accountCode },
    });

    if (!account) {
      throw new NotFoundException(`Akun dengan kode '${accountCode}' tidak ditemukan.`);
    }

    const lines = await this.prisma.journalLine.findMany({
      where: {
        accountCode,
        entry: {
          status: 'POSTED',
        },
      },
    });

    let balance = 0;
    for (const line of lines) {
      const nominal = Number(line.nominal);
      if (account.normalBalance === 'DEBIT') {
        balance += line.side === 'DEBIT' ? nominal : -nominal;
      } else {
        balance += line.side === 'KREDIT' ? nominal : -nominal;
      }
    }

    return Number(balance.toFixed(2));
  }

  /**
   * POST /cashflow: Input Transaksi Arus Kas (Langsung POSTED, tanpa audit)
   */
  async create(dto: CreateCashflowDto, user: { id: string; role: string }) {
    if (user.role === Role.KASIR) {
      throw new ForbiddenException('KASIR tidak diizinkan membuat transaksi arus kas.');
    }

    const transDate = dto.tanggal ? new Date(dto.tanggal) : new Date();

    // Proteksi Tanggal Mundur (> 24 jam) untuk Role FINANCE
    if (user.role === Role.FINANCE && dto.tanggal) {
      const diffMs = Date.now() - transDate.getTime();
      if (diffMs > 24 * 60 * 60 * 1000) {
        throw new BadRequestException(
          'Transaksi tanggal mundur melebihi 24 jam tidak diizinkan untuk role FINANCE.',
        );
      }
    }

    // Verifikasi Keberadaan Akun
    const sourceAccount = await this.prisma.chartOfAccount.findUnique({
      where: { code: dto.sourceAccountCode },
    });
    const targetAccount = await this.prisma.chartOfAccount.findUnique({
      where: { code: dto.targetAccountCode },
    });

    if (!sourceAccount || !targetAccount) {
      throw new NotFoundException('Akun sumber atau akun tujuan tidak terdaftar di COA.');
    }

    // Proteksi Saldo Minus untuk Pengeluaran / Mutasi Kas
    if (
      dto.type === CashflowType.CASHFLOW_OUT ||
      dto.type === CashflowType.CASHFLOW_MUTATION
    ) {
      const currentBalance = await this.getAccountPostedBalance(dto.sourceAccountCode);
      if (currentBalance < dto.nominal) {
        throw new BadRequestException(
          `Saldo kas tidak mencukupi untuk transaksi ini. Saldo saat ini: Rp ${currentBalance.toLocaleString(
            'id-ID',
          )}, Pengeluaran: Rp ${dto.nominal.toLocaleString('id-ID')}`,
        );
      }
    }

    // Transaksi Cashflow LANGSUNG POSTED (Tanpa audit)
    let debitAccountCode = '';
    let kreditAccountCode = '';

    if (dto.type === CashflowType.CASHFLOW_OUT) {
      debitAccountCode = dto.targetAccountCode;
      kreditAccountCode = dto.sourceAccountCode;
    } else if (dto.type === CashflowType.CASHFLOW_IN) {
      debitAccountCode = dto.targetAccountCode;
      kreditAccountCode = dto.sourceAccountCode;
    } else if (dto.type === CashflowType.CASHFLOW_MUTATION) {
      debitAccountCode = dto.targetAccountCode;
      kreditAccountCode = dto.sourceAccountCode;
    }

    return this.prisma.journalEntry.create({
      data: {
        tanggal: transDate,
        keterangan: dto.keterangan,
        sourceType: dto.type,
        status: 'POSTED', // Cashflow langsung POSTED
        total: dto.nominal,
        lines: {
          create: [
            { accountCode: debitAccountCode, side: 'DEBIT', nominal: dto.nominal },
            { accountCode: kreditAccountCode, side: 'KREDIT', nominal: dto.nominal },
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
  }
}
