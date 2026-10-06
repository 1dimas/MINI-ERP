import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class IssueSpDto {
  @IsNotEmpty({ message: 'Alasan penerbitan Surat Peringatan (SP) wajib diisi' })
  @IsString({ message: 'Alasan SP harus berupa string teks' })
  @MinLength(5, { message: 'Alasan SP minimal 5 karakter' })
  reason: string;
}
