import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateSelfDto {
  @IsNotEmpty({ message: 'Password saat ini (lama) wajib diisi untuk verifikasi' })
  @IsString({ message: 'Password lama harus berupa string' })
  oldPassword: string;

  @IsOptional()
  @IsString({ message: 'Password baru harus berupa string' })
  @MinLength(6, { message: 'Password baru minimal 6 karakter' })
  newPassword?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Format email baru tidak valid' })
  newEmail?: string;
}
