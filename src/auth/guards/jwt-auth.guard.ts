import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token otorisasi Bearer tidak ditemukan');
    }

    const token = authHeader.split(' ')[1];

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Token tidak valid atau telah expired');
    }

    if (!payload?.sub) {
      throw new UnauthorizedException('Token tidak memiliki identitas pengguna');
    }

    // Cek status terkini user di database secara real-time
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user) {
      throw new UnauthorizedException('Pengguna tidak ditemukan dalam sistem');
    }

    if (user.status === 'BANNED') {
      throw new UnauthorizedException('Akun telah dibekukan (BANNED). Akses ditolak.');
    }

    request.user = {
      ...payload,
      status: user.status,
    };
    return true;
  }
}
