import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { IssueSpDto } from './dto/issue-sp.dto';
import { UpdateSelfDto } from './dto/update-self.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * OWNER: Tambah Karyawan Baru
   */
  async createAccount(dto: CreateAccountDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new ConflictException(`Email '${dto.email}' sudah terdaftar dalam sistem`);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.toLowerCase().trim(),
        password: hashedPassword,
        role: dto.role,
        status: 'ACTIVE',
        isTwoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    const { password, twoFactorSecret, ...cleanUser } = user;
    return cleanUser;
  }

  /**
   * OWNER: Bekukan (BANNED) akun karyawan
   */
  async banAccount(id: string, currentUserId?: string) {
    if (currentUserId && id === currentUserId) {
      throw new BadRequestException('Anda tidak dapat membekukan (BANNED) akun Anda sendiri');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    if (user.role === 'OWNER') {
      throw new BadRequestException('Akun dengan role OWNER tidak dapat dibekukan');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { status: 'BANNED' },
    });

    const { password, twoFactorSecret, ...cleanUser } = updatedUser;
    return {
      message: `Akun ${cleanUser.name} (${cleanUser.email}) berhasil dibekukan (BANNED)`,
      user: cleanUser,
    };
  }

  /**
   * OWNER: Aktifkan kembali akun yang dibekukan
   */
  async activateAccount(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    const { password, twoFactorSecret, ...cleanUser } = updatedUser;
    return {
      message: `Akun ${cleanUser.name} (${cleanUser.email}) berhasil diaktifkan kembali (ACTIVE)`,
      user: cleanUser,
    };
  }

  /**
   * OWNER: Reset 2FA darurat karyawan (jika HP hilang/rusak)
   */
  async reset2Fa(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        isTwoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    const { password, twoFactorSecret, ...cleanUser } = updatedUser;
    return {
      message: `2FA untuk akun ${cleanUser.name} (${cleanUser.email}) telah di-reset. Karyawan dapat mendaftarkan 2FA baru.`,
      user: cleanUser,
    };
  }

  /**
   * OWNER: Terbitkan Surat Peringatan (SP) untuk karyawan
   */
  async issueWarningLetter(userId: string, issuedById: string, dto: IssueSpDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        receivedWarnings: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Karyawan yang dituju tidak ditemukan');
    }

    if (user.role === 'OWNER') {
      throw new BadRequestException('Surat Peringatan (SP) tidak dapat diterbitkan untuk akun OWNER');
    }

    const warning = await this.prisma.warningLetter.create({
      data: {
        userId,
        issuedById,
        reason: dto.reason.trim(),
      },
      include: {
        issuedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const currentTotalWarnings = user.receivedWarnings.length + 1;
    const isCritical = currentTotalWarnings >= 3;

    return {
      message: `Surat Peringatan (SP #${currentTotalWarnings}) berhasil diterbitkan untuk ${user.name}`,
      warning,
      totalWarnings: currentTotalWarnings,
      isCritical,
      recommendation: isCritical ? 'Banned Akun Ini (Telah mencapai 3 kali SP)' : null,
    };
  }

  /**
   * OWNER: Ambil seluruh daftar user beserta jumlah SP dan histori peringatannya
   */
  async getAccountList() {
    const users = await this.prisma.user.findMany({
      orderBy: { email: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isTwoFactorEnabled: true,
        _count: {
          select: {
            receivedWarnings: true,
          },
        },
        receivedWarnings: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            reason: true,
            createdAt: true,
            issuedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return users.map((u) => ({
      ...u,
      warningCount: u._count.receivedWarnings,
      isCriticalSp: u._count.receivedWarnings >= 3,
    }));
  }

  /**
   * SELF-SERVICE: Update password dan/atau email mandiri (Semua Role)
   * Wajib memverifikasi oldPassword via bcrypt.
   */
  async updateSelf(userId: string, dto: UpdateSelfDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    const isPasswordValid = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password lama salah. Verifikasi identitas gagal.');
    }

    const updateData: { password?: string; email?: string } = {};

    if (dto.newEmail && dto.newEmail.toLowerCase().trim() !== user.email.toLowerCase()) {
      const emailTaken = await this.prisma.user.findUnique({
        where: { email: dto.newEmail.toLowerCase().trim() },
      });
      if (emailTaken) {
        throw new ConflictException(`Email '${dto.newEmail}' sudah digunakan oleh pengguna lain`);
      }
      updateData.email = dto.newEmail.toLowerCase().trim();
    }

    if (dto.newPassword) {
      if (dto.newPassword.length < 6) {
        throw new BadRequestException('Password baru minimal 6 karakter');
      }
      updateData.password = await bcrypt.hash(dto.newPassword, 10);
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('Tidak ada data perubahan yang dikirimkan (email baru atau password baru)');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    const { password, twoFactorSecret, ...cleanUser } = updatedUser;
    return {
      message: 'Profil kredensial berhasil diperbarui',
      user: cleanUser,
    };
  }

  /**
   * SELF-SERVICE: Dapatkan informasi akun pribadi yang sedang login
   */
  async getSelf(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isTwoFactorEnabled: true,
        _count: {
          select: {
            receivedWarnings: true,
          },
        },
        receivedWarnings: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            reason: true,
            createdAt: true,
            issuedBy: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    return {
      ...user,
      warningCount: user._count.receivedWarnings,
    };
  }
}
