import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CashflowService } from './cashflow.service';
import { CreateCashflowDto } from './dto/create-cashflow.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('cashflow')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CashflowController {
  constructor(private readonly cashflowService: CashflowService) {}

  /**
   * POST /cashflow: Input Transaksi Arus Kas
   * Akses: FINANCE (DRAFT) & OWNER (POSTED)
   */
  @Post()
  @Roles(Role.FINANCE, Role.OWNER)
  async create(
    @Body() dto: CreateCashflowDto,
    @GetUser() user: { id: string; role: string },
  ) {
    return this.cashflowService.create(dto, user);
  }

  /**
   * GET /cashflow/pending: Mengambil semua DRAFT Arus Kas yang menunggu audit Owner
   * Akses: OWNER & FINANCE
   */
  @Get('pending')
  @Roles(Role.OWNER, Role.FINANCE)
  async findPending() {
    return this.cashflowService.findPending();
  }

  /**
   * PATCH /cashflow/approve/:id: Owner mengesahkan draf transaksi (DRAFT -> POSTED)
   * Akses: HANYA OWNER
   */
  @Patch('approve/:id')
  @Roles(Role.OWNER)
  async approve(
    @Param('id') id: string,
    @GetUser() user: { id: string; role: string },
  ) {
    return this.cashflowService.approve(id, user);
  }

  /**
   * PATCH /cashflow/reject/:id: Owner membatalkan draf transaksi (DRAFT -> REJECTED)
   * Akses: HANYA OWNER
   */
  @Patch('reject/:id')
  @Roles(Role.OWNER)
  async reject(
    @Param('id') id: string,
    @GetUser() user: { id: string; role: string },
  ) {
    return this.cashflowService.reject(id, user);
  }
}
