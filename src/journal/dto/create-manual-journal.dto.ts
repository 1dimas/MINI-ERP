import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class JournalLineItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Kode akun (accountCode) wajib diisi' })
  accountCode: string;

  @IsEnum(['DEBIT', 'KREDIT'], { message: 'Side harus DEBIT atau KREDIT' })
  @IsNotEmpty({ message: 'Side wajib diisi' })
  side: 'DEBIT' | 'KREDIT';

  @IsNumber({}, { message: 'Nominal harus berupa angka' })
  @Min(0.01, { message: 'Nominal minimal 0.01' })
  nominal: number;
}

export class CreateManualJournalDto {
  @IsOptional()
  @IsDateString({}, { message: 'Tanggal transaksi harus berupa format ISO Date valid' })
  tanggal?: string;

  @IsString()
  @IsNotEmpty({ message: 'Keterangan jurnal wajib diisi' })
  keterangan: string;

  @IsArray({ message: 'Lines harus berupa array transaksi' })
  @ValidateNested({ each: true })
  @Type(() => JournalLineItemDto)
  lines: JournalLineItemDto[];
}
