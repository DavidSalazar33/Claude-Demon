import { prisma } from "./db";
import { categorize } from "./categorize";
import { detectRecurring } from "./recurring";
import { getProvider } from "./providers";

export interface SyncResult {
  provider: string;
  accounts: number;
  transactions: number;
  recurringSeries: number;
  subscriptions: number;
}

// Pulls the latest snapshot from the active provider, upserts accounts and
// transactions (idempotent via externalId), categorizes them, then recomputes
// recurring series. Safe to run repeatedly.
export async function runSync(): Promise<SyncResult> {
  const provider = getProvider();
  const snapshot = await provider.fetchSnapshot();

  // 1. Upsert accounts; map externalId -> db id.
  const accountIdByExternal = new Map<string, string>();
  for (const a of snapshot.accounts) {
    const row = await prisma.account.upsert({
      where: { externalId: a.externalId },
      create: {
        externalId: a.externalId,
        name: a.name,
        officialName: a.officialName,
        institution: a.institution,
        type: a.type,
        mask: a.mask,
        currency: a.currency,
        currentBalance: a.currentBalance,
        availableBalance: a.availableBalance,
      },
      update: {
        currentBalance: a.currentBalance,
        availableBalance: a.availableBalance,
        name: a.name,
      },
    });
    accountIdByExternal.set(a.externalId, row.id);
  }

  // 2. Upsert transactions with categorization.
  for (const t of snapshot.transactions) {
    const accountId = accountIdByExternal.get(t.accountExternalId);
    if (!accountId) continue;
    const category = t.categoryHint ?? categorize(`${t.name} ${t.merchant}`, t.amount);
    await prisma.transaction.upsert({
      where: { externalId: t.externalId },
      create: {
        externalId: t.externalId,
        accountId,
        date: new Date(t.date),
        amount: t.amount,
        name: t.name,
        merchant: t.merchant,
        category,
        pending: t.pending ?? false,
      },
      update: { category, amount: t.amount, pending: t.pending ?? false },
    });
  }

  // 3. Recompute recurring series from all stored transactions.
  const all = await prisma.transaction.findMany({
    select: { externalId: true, merchant: true, date: true, amount: true, category: true },
  });
  const detected = detectRecurring(all);

  // Reset links + series, then rewrite (keeps detection authoritative).
  await prisma.transaction.updateMany({ data: { recurringId: null } });
  await prisma.recurringSeries.deleteMany({});

  let subscriptions = 0;
  for (const s of detected) {
    if (s.isSubscription) subscriptions++;
    const created = await prisma.recurringSeries.create({
      data: {
        merchant: s.merchant,
        category: s.category,
        cadence: s.cadence,
        averageAmount: s.averageAmount,
        occurrences: s.occurrences,
        firstDate: s.firstDate,
        lastDate: s.lastDate,
        nextExpected: s.nextExpected,
        isSubscription: s.isSubscription,
      },
    });
    await prisma.transaction.updateMany({
      where: { externalId: { in: s.memberTxnIds } },
      data: { recurringId: created.id },
    });
  }

  return {
    provider: provider.name,
    accounts: snapshot.accounts.length,
    transactions: snapshot.transactions.length,
    recurringSeries: detected.length,
    subscriptions,
  };
}
