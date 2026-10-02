import { IsOptional, IsString, IsDateString } from 'class-validator';

export class JournalFilterDto {
  @IsOptional()
  @IsString()
  status?: string; // "DRAFT" | "POSTED" | "REJECTED"

  @IsOptional()
  @IsString()
  sourceType?: string; // "MANUAL" | "POS" | "CASHFLOW_OUT" | etc

  @IsOptional()
  @IsDateString({}, { message: 'startDate harus berupa format tanggal ISO valid (YYYY-MM-DD)' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'endDate harus berupa format tanggal ISO valid (YYYY-MM-DD)' })
  endDate?: string;
}
