import { IsNotEmpty, IsString } from 'class-validator';

export class Verify2faDto {
  @IsString()
  @IsNotEmpty({ message: 'userId wajib diisi' })
  userId: string;

  @IsString()
  @IsNotEmpty({ message: 'Kode OTP wajib diisi' })
  otp: string;
}
