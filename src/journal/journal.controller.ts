import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JournalService } from './journal.service';
import { JournalFilterDto } from './dto/journal-filter.dto';
import { CreateManualJournalDto } from './dto/create-manual-journal.dto';
import { UpdateManualJournalDto } from './dto/update-manual-journal.dto';
import { AuditJournalDto } from './dto/audit-journal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('journal')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  /**
   * GET /journal: Tampilkan semua riwayat JournalEntry beserta JournalLine-nya
   * Akses: FINANCE & OWNER
   */
  @Get()
  @Roles(Role.OWNER, Role.FINANCE)
  async findAll(@Query() filterDto: JournalFilterDto) {
    return this.journalService.findAll(filterDto);
  }

  /**
   * POST /journal/manual: Buat jurnal manual
   * Akses: FINANCE & OWNER
   */
  @Post('manual')
  @Roles(Role.FINANCE, Role.OWNER)
  async createManual(
    @Body() dto: CreateManualJournalDto,
    @GetUser() user: { id: string; role: string },
  ) {
    return this.journalService.createManual(dto, user);
  }

  /**
   * PUT /journal/:id: Meng-edit transaksi Jurnal Umum
   * Akses: FINANCE & OWNER
   */
  @Put(':id')
  @Roles(Role.FINANCE, Role.OWNER)
  async updateManual(
    @Param('id') id: string,
    @Body() dto: UpdateManualJournalDto,
    @GetUser() user: { id: string; role: string },
  ) {
    return this.journalService.updateManual(id, dto, user);
  }

  /**
   * PATCH /journal/audit/:id: Eksekusi Audit (APPROVE / REJECT)
   * Akses: FINANCE & OWNER
   */
  @Patch('audit/:id')
  @Roles(Role.FINANCE, Role.OWNER)
  async auditStatus(
    @Param('id') id: string,
    @Body() auditDto: AuditJournalDto,
  ) {
    return this.journalService.auditStatus(id, auditDto);
  }
}
