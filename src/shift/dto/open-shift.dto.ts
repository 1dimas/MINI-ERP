import { IsNumber, Min } from 'class-validator';

export class OpenShiftDto {
  @IsNumber({}, { message: 'Modal awal (startingCash) harus berupa angka' })
  @Min(0, { message: 'Modal awal tidak boleh bernilai negatif' })
  startingCash: number;
}
