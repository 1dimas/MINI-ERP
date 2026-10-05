import { Controller, Get, UseGuards } from '@nestjs/common';
import { SystemService, SystemHealthReport } from './system.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@Controller('system')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER)
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  /**
   * GET /system/health: Diagnostik kesehatan & integritas sistem
   * Akses: HANYA OWNER
   */
  @Get('health')
  async getHealth(): Promise<SystemHealthReport> {
    return this.systemService.getHealthCheck();
  }
}
