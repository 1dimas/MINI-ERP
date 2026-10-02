import { IsOptional, IsDateString } from 'class-validator';

export class DateFilterDto {
  @IsOptional()
  @IsDateString({}, { message: 'startDate harus berupa format tanggal ISO valid (YYYY-MM-DD)' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'endDate harus berupa format tanggal ISO valid (YYYY-MM-DD)' })
  endDate?: string;
}
