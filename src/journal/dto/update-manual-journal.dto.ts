import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JournalLineItemDto } from './create-manual-journal.dto';

export class UpdateManualJournalDto {
  @IsOptional()
  @IsDateString({}, { message: 'Tanggal transaksi harus berupa format ISO Date valid' })
  tanggal?: string;

  @IsOptional()
  @IsString()
  keterangan?: string;

  @IsOptional()
  @IsArray({ message: 'Lines harus berupa array transaksi' })
  @ValidateNested({ each: true })
  @Type(() => JournalLineItemDto)
  lines?: JournalLineItemDto[];
}
