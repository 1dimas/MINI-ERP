import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { IssueSpDto } from './dto/issue-sp.dto';
import { UpdateSelfDto } from './dto/update-self.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('account')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  /**
   * 1. POST /account/create
   * Khusus OWNER: Buat user/karyawan baru
   */
  @Post('create')
  @Roles(Role.OWNER)
  @HttpCode(HttpStatus.CREATED)
  async createAccount(@Body() dto: CreateAccountDto) {
    return this.accountService.createAccount(dto);
  }

  /**
   * 2. PATCH /account/:id/suspend
   * Khusus OWNER: Nonaktifkan akun karyawan (Masa tenggang 3 minggu)
   */
  @Patch(':id/suspend')
  @Roles(Role.OWNER)
  async suspendAccount(
    @Param('id') id: string,
    @GetUser('sub') currentUserId: string,
  ) {
    return this.accountService.suspendAccount(id, currentUserId);
  }

  /**
   * Alias: PATCH /account/:id/ban
   */
  @Patch(':id/ban')
  @Roles(Role.OWNER)
  async banAccount(
    @Param('id') id: string,
    @GetUser('sub') currentUserId: string,
  ) {
    return this.accountService.suspendAccount(id, currentUserId);
  }

  /**
   * 3. PATCH /account/:id/restore
   * Khusus OWNER: Pulihkan akun karyawan dalam masa tenggang 3 minggu (21 hari)
   */
  @Patch(':id/restore')
  @Roles(Role.OWNER)
  async restoreAccount(@Param('id') id: string) {
    return this.accountService.restoreAccount(id);
  }

  /**
   * Alias: PATCH /account/:id/activate
   */
  @Patch(':id/activate')
  @Roles(Role.OWNER)
  async activateAccount(@Param('id') id: string) {
    return this.accountService.restoreAccount(id);
  }

  /**
   * 3b. GET /account/history
   * Khusus OWNER: Daftar riwayat mantan karyawan (Masa Tenggang & Arsip Mati)
   */
  @Get('history')
  @Roles(Role.OWNER)
  async getHistoryAccounts() {
    return this.accountService.getHistoryAccounts();
  }

  /**
   * 4. PATCH /account/:id/reset-2fa
   * Khusus OWNER: Reset 2FA darurat (HP hilang/rusak)
   */
  @Patch(':id/reset-2fa')
  @Roles(Role.OWNER)
  async reset2Fa(@Param('id') id: string) {
    return this.accountService.reset2Fa(id);
  }

  /**
   * 4b. PATCH /account/:id/permissions
   * Khusus OWNER: Kelola Hak Akses Fitur Karyawan (Tanpa Koding Ulang)
   */
  @Patch(':id/permissions')
  @Roles(Role.OWNER)
  async updatePermissions(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionsDto,
  ) {
    return this.accountService.updatePermissions(id, dto.permissions);
  }

  /**
   * 4c. PATCH /account/:id/role
   * Khusus OWNER: Ubah role akun karyawan (misal: KASIR -> FINANCE)
   */
  @Patch(':id/role')
  @Roles(Role.OWNER)
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @GetUser('sub') currentUserId: string,
  ) {
    return this.accountService.updateRole(id, dto, currentUserId);
  }

  /**
   * 5. POST /account/:id/sp
   * Khusus OWNER: Terbitkan Surat Peringatan (SP)
   */
  @Post(':id/sp')
  @Roles(Role.OWNER)
  @HttpCode(HttpStatus.CREATED)
  async issueWarningLetter(
    @Param('id') id: string,
    @GetUser('sub') currentUserId: string,
    @Body() dto: IssueSpDto,
  ) {
    return this.accountService.issueWarningLetter(id, currentUserId, dto);
  }

  /**
   * 6. GET /account/list
   * Khusus OWNER: Ambil seluruh user dan rekap SP
   */
  @Get('list')
  @Roles(Role.OWNER)
  async getAccountList() {
    return this.accountService.getAccountList();
  }

  /**
   * 7. PATCH /account/me/update
   * Self-Service (Semua Role): Ganti password & email sendiri
   */
  @Patch('me/update')
  async updateSelf(
    @GetUser('sub') currentUserId: string,
    @Body() dto: UpdateSelfDto,
  ) {
    return this.accountService.updateSelf(currentUserId, dto);
  }

  /**
   * 8. GET /account/me
   * Self-Service (Semua Role): Ambil detail akun sendiri
   */
  @Get('me')
  async getSelf(@GetUser('sub') currentUserId: string) {
    return this.accountService.getSelf(currentUserId);
  }
}
