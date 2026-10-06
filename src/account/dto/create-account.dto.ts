import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '../../auth/enums/role.enum';

export class CreateAccountDto {
  @IsNotEmpty({ message: 'Nama lengkap wajib diisi' })
  @IsString({ message: 'Nama harus berupa string' })
  name: string;

  @IsNotEmpty({ message: 'Email wajib diisi' })
  @IsEmail({}, { message: 'Format email tidak valid' })
  email: string;

  @IsNotEmpty({ message: 'Password awal wajib diisi' })
  @IsString({ message: 'Password harus berupa string' })
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password: string;

  @IsNotEmpty({ message: 'Role karyawan wajib ditentukan' })
  @IsEnum(Role, { message: 'Role harus salah satu dari: OWNER, FINANCE, KASIR' })
  role: Role;

  @IsOptional()
  @IsArray({ message: 'Permissions harus berupa array string' })
  @IsString({ each: true })
  permissions?: string[];
}
