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
   * 2. PATCH /account/:id/ban
   * Khusus OWNER: Membekukan akun karyawan
   */
  @Patch(':id/ban')
  @Roles(Role.OWNER)
  async banAccount(
    @Param('id') id: string,
    @GetUser('sub') currentUserId: string,
  ) {
    return this.accountService.banAccount(id, currentUserId);
  }

  /**
   * 3. PATCH /account/:id/activate
   * Khusus OWNER: Mengaktifkan kembali akun karyawan
   */
  @Patch(':id/activate')
  @Roles(Role.OWNER)
  async activateAccount(@Param('id') id: string) {
    return this.accountService.activateAccount(id);
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
