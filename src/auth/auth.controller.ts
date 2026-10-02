import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Generate2faDto } from './dto/generate-2fa.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('2fa/generate')
  async generate2FA(@Body() dto: Generate2faDto) {
    return this.authService.generate2FA(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('2fa/verify')
  async verify2FA(@Body() dto: Verify2faDto) {
    return this.authService.verify2FA(dto);
  }
}
