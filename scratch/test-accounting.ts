import { PrismaClient } from '@prisma/client';
import { AccountingService } from '../src/accounting/accounting.service.js';

const prisma = new PrismaClient();
const service = new AccountingService(prisma as any);

async function test() {
  console.log('--- TEST 1: BUKU BESAR (LEDGER 110) ---');
  const ledger = await service.getLedger('110', {});
  console.log('Account:', ledger.account);
  console.log('Ending Balance:', ledger.endingBalance);
  console.log('Transactions:', JSON.stringify(ledger.transactions, null, 2));

  console.log('\n--- TEST 2: NERACA SALDO (TRIAL BALANCE) ---');
  const tb = await service.getTrialBalance({});
  console.log('Summary:', tb.summary);
  console.log('Accounts:', JSON.stringify(tb.accounts, null, 2));

  console.log('\n--- TEST 3: LABA RUGI (PROFIT LOSS) ---');
  const pl = await service.getProfitLoss({});
  console.log('Summary:', pl.summary);
  console.log('Details:', JSON.stringify(pl.details, null, 2));
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
