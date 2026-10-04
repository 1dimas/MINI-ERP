import { IsNumber, Min } from 'class-validator';

export class CloseShiftDto {
  @IsNumber({}, { message: 'Uang fisik akhir (actualEndingCash) harus berupa angka' })
  @Min(0, { message: 'Uang fisik akhir tidak boleh bernilai negatif' })
  actualEndingCash: number;
}
