import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsDateString,
} from 'class-validator';

export enum CashflowType {
  CASHFLOW_OUT = 'CASHFLOW_OUT',
  CASHFLOW_IN = 'CASHFLOW_IN',
  CASHFLOW_MUTATION = 'CASHFLOW_MUTATION',
}

export class CreateCashflowDto {
  @IsEnum(CashflowType, { message: 'Tipe arus kas harus CASHFLOW_OUT, CASHFLOW_IN, atau CASHFLOW_MUTATION' })
  @IsNotEmpty({ message: 'Tipe transaksi arus kas wajib diisi' })
  type: CashflowType;

  @IsString()
  @IsNotEmpty({ message: 'Keterangan transaksi wajib diisi' })
  keterangan: string;

  @IsString()
  @IsNotEmpty({ message: 'Kode akun sumber (sourceAccountCode) wajib diisi' })
  sourceAccountCode: string;

  @IsString()
  @IsNotEmpty({ message: 'Kode akun tujuan/lawan (targetAccountCode) wajib diisi' })
  targetAccountCode: string;

  @IsNumber({}, { message: 'Nominal harus berupa angka' })
  @Min(0.01, { message: 'Nominal transaksi minimal 0.01' })
  nominal: number;

  @IsOptional()
  @IsDateString({}, { message: 'Tanggal transaksi harus berupa ISO Date' })
  tanggal?: string;
}
