# Testing the merged schema (docs/schema.merged.prisma)

`docs/schema.merged.prisma` combines the live backend schema
(`backend/prisma/schema.prisma`) with student-3's QR / recycling /
reward modules, reconciled per `backend/student3-review.md`:

- `Role` stays `STUDENT` / `ADMIN` (no `STAFF`).
- `Transaction` renamed to `RecyclingTransaction`.
- No `LedgerEntry` — `PointsEvent` is the single source of truth for
  balance, extended with optional links to `RecyclingTransaction` and
  `RewardRedemption`, and new event types `QR_RECYCLING_APPROVED`,
  `REWARD_RESERVED`, `REWARD_CANCELLED`.
- `RewardRedemptionStatus` goes `RESERVED` → `COMPLETED` / `CANCELLED`
  instead of straight to `REDEEMED`.

This file is **not** wired into `backend/prisma` — it's a standalone
copy for testing the merge before touching the live schema/migrations.

## One-time environment note (this machine)

If `npx`/`npm` commands fail with `spawn ... ENOENT`, your user-level
`COMSPEC` env var may still be pointing at a Python folder instead of
`cmd.exe` in whatever terminal you're using (already fixed at the user
level, but only new terminal sessions pick it up). Prefix commands with
`COMSPEC="C:\Windows\System32\cmd.exe"` if you hit this, or just open a
fresh terminal.

## 1. Start an isolated test database

Don't reuse the `docker-compose.yml` `postgres` service for this — it's
your real dev database (`sandboxdb`). Use a throwaway container on a
different port instead:

```bash
docker run -d --name schema-merge-test-pg \
  -e POSTGRES_DB=schematest \
  -e POSTGRES_USER=testuser \
  -e POSTGRES_PASSWORD=testpass \
  -p 5433:5432 \
  postgres:16-alpine
```

Wait for it to be ready:

```bash
docker exec schema-merge-test-pg pg_isready -U testuser -d schematest
```

(This container is already running from this session's test — you can
reuse it, or remove and recreate it any time. See cleanup section.)

## 2. Point Prisma at the test database

From `backend/`:

```bash
export DATABASE_URL="postgresql://testuser:testpass@localhost:5433/schematest?schema=public"
```

(PowerShell: `$env:DATABASE_URL = "postgresql://testuser:testpass@localhost:5433/schematest?schema=public"`)

## 3. Validate and push the merged schema

```bash
cd backend
npx prisma validate --schema="../docs/schema.merged.prisma"
npx prisma db push --schema="../docs/schema.merged.prisma" --skip-generate
```

`db push` syncs the schema directly to the database without creating
migration files — the right tool for throwaway schema testing. Already
run once this session: all 20 tables (13 existing + `QRCode`,
`RecyclingTransaction`, `TransactionHistory`, `AuditLog`, `RewardRate`,
`Reward`, `RewardRedemption`) and all enums came out matching the
merged schema exactly.

## 4. Seed it

`backend/prisma/seed.merged.js` seeds the test database with 3 users
(1 admin, 2 students), reward rates, rewards, a full QR → recycling
transaction → points event chain (including a rejected drop-off), and
reward redemptions covering all three flows (reserved, then either
completed-implicitly or cancelled-with-refund):

```bash
node prisma/seed.merged.js
```

It lives in `backend/prisma/` (not `docs/`) so its `import "dotenv/config"`
and `import bcrypt from "bcrypt"` resolve against `backend/node_modules` —
ES module bare-specifier resolution walks up from the importing file's
own folder, not the process's cwd, so a copy sitting under `docs/`
can't see `backend/node_modules`. It imports the generated client from
`../../docs/generated/merged-client/index.js`, so the schema/client
stay in `docs/` as intended.

Re-running it is safe (`upsert` throughout) — but if you want a
guaranteed-clean state matching this doc's row counts exactly, force-reset
first:

```bash
npx prisma db push --schema="../docs/schema.merged.prisma" --skip-generate --force-reset
node prisma/seed.merged.js
```

On a freshly reset database this produces: 3 `User`, 3 `RewardRate`,
3 `Reward`, 3 `QRCode`, 3 `RecyclingTransaction` (1 rejected), 1
`TransactionHistory`, 1 `AuditLog`, 2 `RewardRedemption` (1 reserved,
1 cancelled+refunded), 5 `PointsEvent`, netting the seeded student to
**16 points** (+16 plastic, −20 tote-bag reservation, +20 e-waste,
−35/+35 net-zero for the cancelled bottle).

### Complete test: also seed the live-schema tables

`prisma/seed.merged.js` only covers the new QR/recycling/reward tables.
To populate every table in the merged schema (Mission, Content, Quiz,
Badge, LearningProgress, etc. too), also run the existing live seed
script against the same test database — it uses the default
`@prisma/client` (generated from `backend/prisma/schema.prisma`), which
works fine here since every field/table it touches is an identical
subset of the merged schema:

```bash
node prisma/seed.js
```

Safe to run in either order relative to `seed.merged.js` (both are
`upsert`-based and match on `email`/unique fields, so `USR001`-`USR003`
just get updated rather than duplicated). After both scripts, only
`QuizAttempt`, `BadgeAward`, and `UploadedFile` stay at 0 rows — those
represent real user activity/uploads that neither seed script (nor the
live one) creates.

## 5. Inspect the data visually (optional)

```bash
npx prisma studio --schema="../docs/schema.merged.prisma"
```

Opens a browser UI against the test database so you can add/edit rows
by hand.

## 6. Smoke-test the relation chain manually (optional)

The seed script above already covers this more thoroughly, but if you
want to poke the raw SQL directly (as was done once earlier this
session before the seed script existed):

```bash
docker exec -i schema-merge-test-pg psql -U testuser -d schematest <<'SQL'
BEGIN;
INSERT INTO "User" (id, name, email, "passwordHash", role, "createdAt", "updatedAt")
VALUES ('u1', 'Test Student', 'student@test.local', 'hash', 'STUDENT', now(), now());
INSERT INTO "QRCode" (id, nonce, signature, payload, status, "expiresAt", "issuedBy", "claimedBy", "claimedAt", "createdAt", "updatedAt")
VALUES ('qr1', 'nonce-1', 'sig-1', '{"weightKg":2.5}', 'CLAIMED', now() + interval '1 day', 'u1', 'u1', now(), now(), now());
INSERT INTO "RecyclingTransaction" (id, "userId", "qrId", status, "materialType", "estimatedWeightKg", points, "createdAt", "updatedAt")
VALUES ('tx1', 'u1', 'qr1', 'APPROVED', 'PLASTIC', 2.5, 25, now(), now());
INSERT INTO "PointsEvent" (id, "userId", "recyclingTransactionId", points, "eventType", status, "approvedAt", "createdAt", "updatedAt")
VALUES ('pe1', 'u1', 'tx1', 25, 'QR_RECYCLING_APPROVED', 'SENT', now(), now(), now());
INSERT INTO "Reward" (id, name, "pointsRequired", stock, "createdAt", "updatedAt")
VALUES ('rw1', 'Eco Tote Bag', 20, 5, now(), now());
INSERT INTO "RewardRedemption" (id, "userId", "rewardId", "pointsUsed", status, "createdAt", "updatedAt")
VALUES ('rr1', 'u1', 'rw1', 20, 'RESERVED', now(), now());
INSERT INTO "PointsEvent" (id, "userId", "rewardRedemptionId", points, "eventType", status, "approvedAt", "createdAt", "updatedAt")
VALUES ('pe2', 'u1', 'rr1', -20, 'REWARD_RESERVED', 'SENT', now(), now(), now());
COMMIT;

SELECT sum(points) AS net_points FROM "PointsEvent" WHERE "userId" = 'u1';
SQL
```

## 6. Clean up when done

```bash
docker rm -f schema-merge-test-pg
```

This drops the throwaway container and its data — your real dev
database (`sandboxdb`, from `docker-compose.yml`) is never touched by
any of the above.

## Next steps if the merge looks good

Per `backend/student3-review.md`'s merge-safety recommendations:
start from `dev`, manually port the QR/transaction/reward *logic*
(rewritten to match the main backend's ES-module pattern, bearer-token
auth, and `PointsEvent`-based points), then run
`prisma migrate dev --name add_qr_recycling_reward` against the real
schema only once the manually-ported code and this tested schema shape
are both ready — not before.
