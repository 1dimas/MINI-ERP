import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JournalService } from './journal.service';
import { JournalFilterDto } from './dto/journal-filter.dto';
import { CreateManualJournalDto } from './dto/create-manual-journal.dto';
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
   * Filter Query: status (DRAFT/POSTED/REJECTED), sourceType, startDate, endDate
   * Akses: FINANCE & OWNER
   */
  @Get()
  @Roles(Role.OWNER, Role.FINANCE)
  async findAll(@Query() filterDto: JournalFilterDto) {
    return this.journalService.findAll(filterDto);
  }

  /**
   * POST /journal/manual: Buat jurnal manual
   * Jika role FINANCE -> Otomatis status DRAFT
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
   * PATCH /journal/audit/:id: Eksekusi Audit (APPROVE / REJECT)
   * Payload: { "action": "APPROVE" | "REJECT" }
   * Akses: HANYA OWNER
   */
  @Patch('audit/:id')
  @Roles(Role.OWNER)
  async auditStatus(
    @Param('id') id: string,
    @Body() auditDto: AuditJournalDto,
  ) {
    return this.journalService.auditStatus(id, auditDto);
  }
}
