import { IsEnum, IsNotEmpty } from 'class-validator';

export enum AuditAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class AuditJournalDto {
  @IsEnum(AuditAction, { message: 'Action audit harus APPROVE atau REJECT' })
  @IsNotEmpty({ message: 'Action wajib diisi' })
  action: AuditAction;
}
