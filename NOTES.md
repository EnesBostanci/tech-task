# ClipPay take-home

## Setup

Requires Node 20+, Docker, and pnpm Tests and ingest talk to the same Postgres as the app, so Docker has to be up.

```bash
cp .env.example .env
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open http://localhost:3000 and use the header user switcher (seeded admins/creators).

After seeding, run ingest to confirm it works against the seeded data

```bash
pnpm ingest  
```

## Tests
Tests hit the same Postgres as the app and truncate the tables first, so seeded data is wiped. After running tests, reseed before using the UI or ingest:
```bash
pnpm test
pnpm db:seed 

Metrics Ingest

pnpm ingest creates one submission_metric row per approved submission per UTC day.

Views only increase; first-time metrics start at a minimum of 1,000 views.
A unique (submission_id, captured_at) constraint prevents duplicate daily metrics, with onConflictDoNothing() handling concurrent runs.
Each submission is processed independently, so one failure does not stop the rest.
Payout is floor(views / 1000) * payout_per_1k. Earnings and campaign spending are settled incrementally without exceeding the campaign budget.
Seed data includes a few metrics for budget-ceiling and completed-campaign scenarios.

## Concurrent approvals


Approvals are handled with a conditional database UPDATE inside a transaction (atomic operation) . The budget check and increment happen atomically, so when two admins approve against a budget that only covers one payout, only the first successful update can reserve the remaining budget; the other fails with BUDGET_EXCEEDED.

```sql
UPDATE campaigns
SET spent_budget = spent_budget + $cost,
    status = CASE WHEN spent_budget + $cost >= total_budget
      THEN 'completed' ELSE status END
WHERE id = $id
  AND status = 'active'
  AND spent_budget + $cost <= total_budget
```

If that update returns no row → typed `BUDGET_EXCEEDED` (tRPC error `cause.appCode`), transaction rolls back.

Tried / ruled out: advisory locks and `SELECT … FOR UPDATE` on the campaign — unnecessary once the budget check is a single conditional `UPDATE`; the row lock from the update is enough for first-come-first-served.

## Left out on purpose

- Real auth provider
- `paid` status transitions / payouts
- Fancy design / marketing polish

## First thing I’d fix given another day

handle leftover budget: if remaining is $30.00 and the clip would cost $30.30, offer a **pay remainder** option instead of only `BUDGET_EXCEEDED`. 

Give Vitest its own Postgres database so tests stop truncating the app seed, and run ingest on a cron instead of by hand.

Also soft-delete users and campaigns (`deleted_at`) so cascade doesn’t erase submission history.

## Dependencies worth noting

- `drizzle-zod` — database schema as the source of truth; form/API schemas generated from the tables, then refined

- `recharts` — daily views chart on campaign detail



## AI usage

I used AI throughout the task for brainstorming, implementation suggestions, and code review. I reviewed its output against the assignment requirements and made changes where the suggestions did not fully match the business logic.

For example, I changed the initial schema approach by switching the Zod/tRPC inputs to be generated from the Drizzle tables and then refined where needed, keeping the database schema as the source of truth. I also identified skipped or missing test cases from the initial output and added edge cases around payout calculations, budget limits, concurrent approvals, and repeated metrics ingestion. Finally, I reviewed and adjusted the generated seed data to make the scenarios more realistic and ensure they did not conflict with the application's business logic.
