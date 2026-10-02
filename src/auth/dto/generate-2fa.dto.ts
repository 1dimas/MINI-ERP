import { IsNotEmpty, IsString } from 'class-validator';

export class Generate2faDto {
  @IsString()
  @IsNotEmpty({ message: 'userId wajib diisi' })
  userId: string;
}
