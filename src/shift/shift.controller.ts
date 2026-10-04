import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ShiftService } from './shift.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('shift')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.KASIR, Role.OWNER)
export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  /**
   * POST /shift/open: Buka shift kasir dengan uang modal awal
   * Akses: KASIR & OWNER
   */
  @Post('open')
  async openShift(
    @Body() dto: OpenShiftDto,
    @GetUser() user: { id: string; name?: string; role: string },
  ) {
    return this.shiftService.openShift(dto, user);
  }

  /**
   * GET /shift/current: Ambil informasi shift yang sedang aktif (OPEN) beserta kalkulasi expectedEndingCash
   * Akses: KASIR & OWNER
   */
  @Get('current')
  async getCurrentShift(@GetUser('id') userId: string) {
    return this.shiftService.getCurrentShift(userId);
  }

  /**
   * POST /shift/close: Tutup shift kasir dengan memasukkan uang fisik akhir dan auto-journal selisih kas
   * Akses: KASIR & OWNER
   */
  @Post('close')
  async closeShift(
    @Body() dto: CloseShiftDto,
    @GetUser() user: { id: string; name?: string; role: string },
  ) {
    return this.shiftService.closeShift(dto, user);
  }
}
