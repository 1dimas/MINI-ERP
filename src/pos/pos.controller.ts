import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PosService } from './pos.service';
import { CheckoutDto } from './dto/checkout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('pos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.KASIR, Role.OWNER)
export class PosController {
  constructor(private readonly posService: PosService) {}

  /**
   * POST /pos/checkout
   * Memproses transaksi kasir: validasi SN, hitung harga, periksa uang bayar, update stok SOLD,
   * catat PosTransaction, dan buat auto-journal 4 baris POSTED.
   * Akses: KASIR & OWNER
   */
  @Post('checkout')
  async checkout(
    @Body() dto: CheckoutDto,
    @GetUser() user: { id: string; name?: string; email?: string; role: string },
  ) {
    return this.posService.checkout(dto, user);
  }

  /**
   * GET /pos/scan/:serialNumber
   * Scan barcode/QR Serial Number untuk menampilkan detail unit dan memvalidasi ketersediaannya
   * Akses: KASIR & OWNER
   */
  @Get('scan/:serialNumber')
  async scanUnit(@Param('serialNumber') serialNumber: string) {
    return this.posService.scanUnit(serialNumber);
  }

  /**
   * GET /pos/transactions
   * Mengambil riwayat transaksi penjualan POS
   * Akses: KASIR & OWNER
   */
  @Get('transactions')
  async getTransactions() {
    return this.posService.getTransactions();
  }

  /**
   * GET /pos/transactions/:id
   * Mengambil detail transaksi POS tertentu (untuk cetak struk)
   * Akses: KASIR & OWNER
   */
  @Get('transactions/:id')
  async getTransactionById(@Param('id') id: string) {
    return this.posService.getTransactionById(id);
  }

  /**
   * POST /pos/void/:invoiceNumber
   * Otorisasi ketat OWNER: Membatalkan transaksi (VOID), mengembalikan stok ke AVAILABLE,
   * dan mencatat Jurnal Pembalik (Reversal) otomatis.
   * Akses: HANYA OWNER
   */
  @Post('void/:invoiceNumber')
  @Roles(Role.OWNER)
  async voidTransaction(
    @Param('invoiceNumber') invoiceNumber: string,
    @GetUser() user: { id: string; name?: string; email?: string; role: string },
  ) {
    return this.posService.voidTransaction(invoiceNumber, user);
  }
}
