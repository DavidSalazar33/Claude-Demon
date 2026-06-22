# 💰 Money Tracker

A self-hostable personal finance dashboard that brings all your accounts into
one place: spending by category, monthly trends, and automatic detection of
recurring charges & subscriptions.

It ships with a **realistic mock data provider** so the whole app runs with zero
credentials. Connecting real banks later is a single, isolated change — see
[Connecting real accounts](#connecting-real-accounts).

## Features

- **Dashboard** — 30-day spending, income, and net; spending-by-category donut;
  6-month income-vs-spending trend; top categories and merchants.
- **Transactions** — searchable, filterable ledger across every account with
  automatic categorization.
- **Subscriptions & recurring** — detects recurring charges, separates
  discretionary subscriptions (Netflix, Spotify, gym…) from bills (rent,
  utilities), and estimates monthly/yearly subscription cost.
- **Accounts** — balances per account plus assets / liabilities / net worth.

## Tech

Next.js (App Router) · TypeScript · Tailwind · Prisma · Recharts.
SQLite for local dev; Postgres for self-hosted production.

## Quick start (local)

```bash
npm install
cp .env.example .env
npm run setup        # prisma generate + db push + seed mock data
npm run dev          # http://localhost:3000
```

`npm run setup` is idempotent. To wipe and reseed: `npm run db:reset`.
Click **↻ Refresh** in the header (or `POST /api/sync`) to re-sync any time.

## Self-hosting

```bash
docker compose up -d --build
docker compose exec app npx tsx prisma/seed.ts   # seed once
```

App serves on port 3000 with a persistent SQLite volume. To use Postgres,
follow the comments in `docker-compose.yml` and `prisma/schema.prisma`.

## Connecting real accounts

All account data flows through one interface — `FinancialProvider`
(`src/lib/providers/types.ts`). The app, sync, categorization, and analytics
never touch a specific bank API. Two implementations exist:

- `MockProvider` — realistic generated data (default).
- `PlaidProvider` — stub for [Plaid](https://dashboard.plaid.com) aggregation.

To go live: implement `PlaidProvider.fetchSnapshot()` (steps are in
`src/lib/providers/plaidProvider.ts`), set `FINANCIAL_PROVIDER=plaid` plus your
Plaid credentials, and re-sync. Nothing else changes.

## How it works

```
provider.fetchSnapshot()  ->  runSync()  ->  SQLite/Postgres  ->  server components
   (mock | plaid)              categorize + detect recurring        (dashboard, etc.)
```

- **Categorization** (`src/lib/categorize.ts`) — fast, local, rule-based keyword
  matching. Prefers a provider category hint when present.
- **Recurring detection** (`src/lib/recurring.ts`) — groups by merchant, infers
  cadence from the median gap between charges, and requires stable amounts to
  avoid false positives. Pure and unit-testable.

## Project layout

```
src/lib/providers/   provider interface + mock & plaid implementations
src/lib/sync.ts      pull -> categorize -> store -> detect recurring
src/lib/analytics.ts dashboard aggregations
src/lib/recurring.ts recurring-series detection
src/app/             dashboard, transactions, subscriptions, accounts
prisma/              schema + seed
```

> ⚠️ This is a personal tool. Financial data is sensitive — keep your `.env`
> private, host it behind authentication, and use HTTPS for any non-local
> deployment.
