import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AccountingModule } from './accounting/accounting.module';
import { JournalModule } from './journal/journal.module';
import { CashflowModule } from './cashflow/cashflow.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AccountingModule,
    JournalModule,
    CashflowModule,
  ],
})
export class AppModule {}
