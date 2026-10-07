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
import { UpdateRoleDto } from './dto/update-role.dto';
import * as bcrypt from 'bcrypt';

import { getEffectivePermissions, ROLE_DEFAULT_PERMISSIONS } from '../../lib/permissions';

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
    const initialPermissions = dto.permissions && dto.permissions.length > 0
      ? dto.permissions
      : (ROLE_DEFAULT_PERMISSIONS[dto.role] || []);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.toLowerCase().trim(),
        password: hashedPassword,
        role: dto.role,
        status: 'ACTIVE',
        permissions: initialPermissions,
        isTwoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    const { password, twoFactorSecret, ...cleanUser } = user;
    return {
      ...cleanUser,
      effectivePermissions: getEffectivePermissions(cleanUser),
    };
  }

  /**
   * OWNER: Perbarui Hak Akses Fitur Karyawan (Tanpa Koding Ulang)
   */
  async updatePermissions(id: string, permissions: string[]) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    if (user.role === 'OWNER') {
      throw new BadRequestException('Role OWNER selalu memiliki akses ke seluruh fitur sistem');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { permissions },
    });

    const { password, twoFactorSecret, ...cleanUser } = updatedUser;
    return {
      message: `Hak akses fitur untuk ${cleanUser.name} (${cleanUser.role}) berhasil diperbarui`,
      user: {
        ...cleanUser,
        effectivePermissions: getEffectivePermissions(cleanUser),
      },
    };
  }

  /**
   * OWNER: Ubah role akun karyawan (misal: KASIR -> FINANCE atau sebaliknya)
   * Dilengkapi fail-safe pencegahan perubahan role Owner sendiri & sinkronisasi fitur default role baru.
   */
  async updateRole(id: string, dto: UpdateRoleDto, currentUserId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    // Fail-safe: Cegah owner mengubah role akun dirinya sendiri agar tidak terkunci
    if (currentUserId && id === currentUserId && dto.role !== 'OWNER') {
      throw new BadRequestException('Anda tidak dapat menurunkan role akun Anda sendiri dari OWNER');
    }

    // Jika role sama dan tidak ada penyesuaian izin khusus, kembalikan user saat ini
    if (user.role === dto.role && !dto.permissions) {
      return {
        message: `Akun ${user.name} sudah memiliki role ${user.role}`,
        user: {
          ...user,
          effectivePermissions: getEffectivePermissions(user),
        },
      };
    }

    // Tentukan permissions baru
    let newPermissions: string[] = user.permissions || [];

    if (dto.role === 'OWNER') {
      newPermissions = []; // Owner otomatis mendapatkan 100% via getEffectivePermissions
    } else if (dto.permissions && dto.permissions.length > 0) {
      newPermissions = dto.permissions;
    } else if (dto.resetPermissions !== false) {
      // Default: Reset ke template role baru
      newPermissions = ROLE_DEFAULT_PERMISSIONS[dto.role] || [];
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        role: dto.role,
        permissions: newPermissions,
      },
    });

    const { password, twoFactorSecret, ...cleanUser } = updatedUser;
    return {
      message: `Role untuk ${cleanUser.name} berhasil diubah dari ${user.role} menjadi ${cleanUser.role}`,
      user: {
        ...cleanUser,
        effectivePermissions: getEffectivePermissions(cleanUser),
      },
    };
  }

  /**
   * OWNER: Nonaktifkan (SUSPEND) akun karyawan (Masa tenggang 3 minggu / 21 hari)
   */
  async suspendAccount(id: string, currentUserId?: string) {
    if (currentUserId && id === currentUserId) {
      throw new BadRequestException('Anda tidak dapat menonaktifkan (SUSPEND) akun Anda sendiri');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    if (user.role === 'OWNER') {
      throw new BadRequestException('Akun dengan role OWNER tidak dapat di-suspend');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        suspendedAt: new Date(),
      },
    });

    const { password, twoFactorSecret, ...cleanUser } = updatedUser;
    return {
      message: `Akun ${cleanUser.name} (${cleanUser.email}) berhasil dinonaktifkan (SUSPENDED). Masa tenggang 3 minggu (21 hari) dimulai.`,
      user: cleanUser,
    };
  }

  /**
   * Alias kompatibilitas banAccount -> suspendAccount
   */
  async banAccount(id: string, currentUserId?: string) {
    return this.suspendAccount(id, currentUserId);
  }

  /**
   * OWNER: Pulihkan (RESTORE) akun dalam batas masa tenggang 3 minggu (21 hari)
   */
  async restoreAccount(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    if (user.status !== 'SUSPENDED') {
      if (user.status === 'ARCHIVED') {
        throw new BadRequestException(
          'Masa tenggang 3 minggu sudah habis. Akun ini sudah menjadi arsip mati (ARCHIVED) dan tidak bisa dipulihkan.',
        );
      }
      throw new BadRequestException(`Hanya akun dengan status SUSPENDED yang dapat dipulihkan. Status saat ini: ${user.status}`);
    }

    if (!user.suspendedAt) {
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: { status: 'ACTIVE', suspendedAt: null },
      });
      const { password, twoFactorSecret, ...cleanUser } = updatedUser;
      return {
        message: `Akun ${cleanUser.name} (${cleanUser.email}) berhasil dipulihkan (ACTIVE)`,
        user: cleanUser,
      };
    }

    const diffTime = Date.now() - new Date(user.suspendedAt).getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 21) {
      // Lewat dari 3 minggu: kunci menjadi ARCHIVED permanen
      await this.prisma.user.update({
        where: { id },
        data: { status: 'ARCHIVED' },
      });
      throw new BadRequestException(
        `Masa tenggang 3 minggu sudah habis (${diffDays} hari sejak suspend). Akun ini sudah menjadi arsip mati (ARCHIVED) dan tidak bisa dipulihkan.`,
      );
    }

    // Masih dalam batas <= 21 hari: pulihkan ke ACTIVE
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        suspendedAt: null,
      },
    });

    const { password, twoFactorSecret, ...cleanUser } = updatedUser;
    return {
      message: `Akun ${cleanUser.name} (${cleanUser.email}) berhasil dipulihkan (ACTIVE) dalam masa tenggang (${21 - diffDays} hari tersisa).`,
      user: cleanUser,
    };
  }

  /**
   * Alias kompatibilitas activateAccount -> restoreAccount
   */
  async activateAccount(id: string) {
    return this.restoreAccount(id);
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
   * OWNER: Ambil seluruh daftar user aktif & terkini beserta status grace period & SP
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
        suspendedAt: true,
        permissions: true,
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

    return Promise.all(
      users.map(async (u) => {
        let currentStatus = u.status;
        let daysSuspended = 0;
        let remainingDays = 0;
        let canRestore = false;

        if (u.suspendedAt) {
          const diffTime = Date.now() - new Date(u.suspendedAt).getTime();
          daysSuspended = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          remainingDays = Math.max(0, 21 - daysSuspended);

          // Otomatis ubah jadi ARCHIVED jika sudah lewat 21 hari
          if (u.status === 'SUSPENDED' && daysSuspended > 21) {
            currentStatus = 'ARCHIVED';
            await this.prisma.user.update({
              where: { id: u.id },
              data: { status: 'ARCHIVED' },
            });
          }
        }

        canRestore = currentStatus === 'SUSPENDED' && remainingDays > 0;

        return {
          ...u,
          status: currentStatus,
          effectivePermissions: getEffectivePermissions(u),
          warningCount: u._count.receivedWarnings,
          isCriticalSp: u._count.receivedWarnings >= 3,
          daysSuspended,
          remainingDays,
          canRestore,
        };
      }),
    );
  }

  /**
   * OWNER: Daftar riwayat mantan karyawan (Masa Tenggang & Arsip Mati)
   */
  async getHistoryAccounts() {
    const users = await this.prisma.user.findMany({
      where: {
        status: { in: ['SUSPENDED', 'ARCHIVED'] },
      },
      orderBy: { suspendedAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        suspendedAt: true,
        permissions: true,
        isTwoFactorEnabled: true,
        _count: {
          select: { receivedWarnings: true },
        },
        receivedWarnings: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            reason: true,
            createdAt: true,
          },
        },
      },
    });

    return Promise.all(
      users.map(async (u) => {
        let currentStatus = u.status;
        let daysSuspended = 0;
        let remainingDays = 0;
        let canRestore = false;

        if (u.suspendedAt) {
          const diffTime = Date.now() - new Date(u.suspendedAt).getTime();
          daysSuspended = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          remainingDays = Math.max(0, 21 - daysSuspended);

          if (u.status === 'SUSPENDED' && daysSuspended > 21) {
            currentStatus = 'ARCHIVED';
            await this.prisma.user.update({
              where: { id: u.id },
              data: { status: 'ARCHIVED' },
            });
          }
        }

        canRestore = currentStatus === 'SUSPENDED' && remainingDays > 0;

        return {
          ...u,
          status: currentStatus,
          effectivePermissions: getEffectivePermissions(u),
          warningCount: u._count.receivedWarnings,
          daysSuspended,
          remainingDays,
          canRestore,
        };
      }),
    );
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
        permissions: true,
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
      effectivePermissions: getEffectivePermissions(user),
      warningCount: user._count.receivedWarnings,
    };
  }
}
