import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AccountingModule } from './accounting/accounting.module';
import { JournalModule } from './journal/journal.module';
import { CashflowModule } from './cashflow/cashflow.module';
import { PosModule } from './pos/pos.module';
import { ShiftModule } from './shift/shift.module';
import { SystemModule } from './system/system.module';
import { AccountModule } from './account/account.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AccountingModule,
    JournalModule,
    CashflowModule,
    PosModule,
    ShiftModule,
    SystemModule,
    AccountModule,
  ],
})
export class AppModule {}
