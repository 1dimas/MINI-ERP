import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Generate2faDto } from './dto/generate-2fa.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';
import * as bcrypt from 'bcrypt';
import { generateSecret, generateURI, verify } from 'otplib';
import * as QRCode from 'qrcode';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * POST /auth/register
   * Hanya diperbolehkan untuk pendaftaran user pertama dalam sistem.
   */
  async register(dto: RegisterDto) {
    const userCount = await this.prisma.user.count();
    if (userCount > 0) {
      throw new ForbiddenException(
        'Registrasi ditutup. Sistem sudah memiliki akun terdaftar.',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashedPassword,
        role: dto.role || 'OWNER',
      },
    });

    // Enforce keamanan: Buang password dan twoFactorSecret dari response JSON
    const { password, twoFactorSecret, ...result } = user;
    return result;
  }

  /**
   * POST /auth/login
   * Jika user mengaktifkan 2FA (isTwoFactorEnabled: true), JANGAN kembalikan token.
   * Kembalikan response { requires2FA: true, userId: user.id }.
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email atau password salah');
    }

    if (user.status === 'BANNED') {
      throw new UnauthorizedException('Akun Anda telah dinonaktifkan/dibekukan (BANNED). Silakan hubungi Owner.');
    }

    // ATURAN KRUSIAL: Jika 2FA aktif, tahan token dan minta verifikasi 2FA terlebih dahulu
    if (user.isTwoFactorEnabled) {
      return {
        requires2FA: true,
        userId: user.id,
      };
    }

    // Jika 2FA tidak aktif, terbitkan JWT Access Token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    const { password, twoFactorSecret, ...userClean } = user;
    return {
      accessToken,
      user: userClean,
    };
  }

  /**
   * POST /auth/2fa/generate
   * Membuat secret 2FA baru, simpan ke database, dan kembalikan QR code Base64.
   */
  async generate2FA(dto: Generate2faDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    // Generate secret TOTP baru via otplib v13
    const secret = generateSecret();

    // Simpan secret ke database
    await this.prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret },
    });

    // Buat otpauth URI & QR Code
    const appName = 'MyToko POS';
    const otpauthUrl = generateURI({
      secret,
      label: user.email,
      issuer: appName,
    });
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    return {
      qrCodeUrl,
      secret,
    };
  }

  /**
   * POST /auth/2fa/verify
   * Verifikasi kode OTP dari user/kasir. Jika valid, aktifkan 2FA (isTwoFactorEnabled: true)
   * dan kembalikan JWT Access Token final.
   */
  async verify2FA(dto: Verify2faDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    if (user.status === 'BANNED') {
      throw new UnauthorizedException('Akun Anda telah dinonaktifkan/dibekukan (BANNED). Silakan hubungi Owner.');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException(
        '2FA Secret belum dibuat. Silakan generate 2FA terlebih dahulu.',
      );
    }

    // Verifikasi OTP token via otplib v13
    const isValid = verify({
      token: dto.otp,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      throw new UnauthorizedException('Kode OTP / 2FA tidak valid');
    }

    // Aktifkan flag isTwoFactorEnabled jika belum aktif
    if (!user.isTwoFactorEnabled) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isTwoFactorEnabled: true },
      });
    }

    // Terbitkan JWT Access Token final
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    const { password, twoFactorSecret, ...userClean } = user;
    return {
      accessToken,
      user: userClean,
    };
  }
}
