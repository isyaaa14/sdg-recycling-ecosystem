# Testing the merged schema (superseded)

This document originally walked through testing `docs/schema.merged.prisma`
— an early, standalone reconciliation of the live backend schema with the
*original* student-3 QR/recycling/reward branch, validated with `prisma db
push` against a throwaway database before any application code existed for
it.

That exploratory schema has since been superseded. The actual merge used a
more complete, further-along snapshot (the "Full-Integration" folder) whose
schema and application code already matched the review's naming and safety
recommendations, and it has been merged into the real `backend/prisma/schema.prisma`
via proper `prisma migrate dev` migrations — not `db push`. `docs/schema.merged.prisma`,
`docs/schema.postgresql.prisma`, and the generated client under `docs/generated/`
have been removed since they no longer reflect the schema actually in use.

For the current state:

- Live schema: `backend/prisma/schema.prisma`
- Migrations: `backend/prisma/migrations/` (see `add_recycling_rewards_anti_gaming_leaderboard`
  and `add_points_event_idempotency_indexes` for the recycling/reward merge)
- Seed data: `backend/prisma/seed.js`
- API reference: `docs/API_CONTRACT.md` (Recycling, Rewards, Leaderboard, Anti-Gaming, User Profile sections)
- Local Docker test flow: `docs/LOCAL_INTEGRATION_GUIDE.md`
