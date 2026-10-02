import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { DateFilterDto } from './dto/date-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@Controller('accounting')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER, Role.FINANCE)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  /**
   * GET /accounting/ledger/:accountCode (Buku Besar)
   */
  @Get('ledger/:accountCode')
  async getLedger(
    @Param('accountCode') accountCode: string,
    @Query() filterDto: DateFilterDto,
  ) {
    return this.accountingService.getLedger(accountCode, filterDto);
  }

  /**
   * GET /accounting/trial-balance (Neraca Saldo)
   */
  @Get('trial-balance')
  async getTrialBalance(@Query() filterDto: DateFilterDto) {
    return this.accountingService.getTrialBalance(filterDto);
  }

  /**
   * GET /accounting/profit-loss (Laba Rugi)
   */
  @Get('profit-loss')
  async getProfitLoss(@Query() filterDto: DateFilterDto) {
    return this.accountingService.getProfitLoss(filterDto);
  }
}
