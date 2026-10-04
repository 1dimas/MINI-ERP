import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ArrayMinSize,
} from 'class-validator';

export enum PaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
}

export class CheckoutDto {
  @IsEnum(PaymentMethod, {
    message: 'Metode pembayaran harus berupa CASH atau TRANSFER',
  })
  @IsNotEmpty({ message: 'Metode pembayaran wajib diisi' })
  paymentMethod: PaymentMethod;

  @IsNumber({}, { message: 'Nominal pembayaran (amountPaid) harus berupa angka' })
  @Min(0, { message: 'Nominal pembayaran tidak boleh kurang dari 0' })
  amountPaid: number;

  @IsArray({ message: 'Items harus berupa array serial number' })
  @ArrayMinSize(1, { message: 'Items minimal harus memiliki 1 serial number' })
  @IsString({ each: true, message: 'Setiap serial number dalam items harus berupa string' })
  items: string[];
}
