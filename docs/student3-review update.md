# student 3 / full integration backend review

## current status

- original student 3 work is still not merge safe.
- but now got new `Full-Integration` folder from teammate.
- full integration is more useful than original student 3 folder.
- full integration has real backend modules for recycling, qr, reward, anti gaming, leaderboard, user route.
- full integration schema validates.
- full integration js syntax check pass.
- but database design is different from our sandbox / docs plan.

## his part

- recycling qr flow.
- recycling submission flow.
- reward redeem flow.
- points event integration.
- anti gaming checks.
- leaderboard.
- user profile route.
- recycling proof upload.
- reward image upload.
- prisma schema and migrations for these modules.

## what is good

- full integration is already using main backend style better than old student 3 work.
- uses `import` style like main backend.
- routes are wired in `app.js`.
- uses existing auth middleware.
- role still looks like main backend `STUDENT` and `ADMIN`.
- has manual recycling submission, not only qr.
- qr flow is better now: admin issue qr, student claim qr.
- qr claim uses signed payload and nonce check.
- duplicate qr claim should be blocked.
- recycling submission goes pending review first.
- admin approve / reject flow is clearer.
- points only awarded after admin approve.
- anti gaming idea is good.
- daily point cap is good.
- proof upload for recycling is useful.
- reward images are useful for frontend.
- leaderboard is useful for gamification.
- schema validates.
- js syntax check passed.

## what is not working / risky

- full integration database is different from our current sandbox and docs schema.
- this means cannot just copy paste into main backend without deciding final database design.
- full integration uses `RecyclingSubmission`, but our sandbox/docs used `RecyclingTransaction`.
- full integration uses `RecyclingQrCode`, but our sandbox/docs used `QRCode`.
- full integration uses `Redemption`, but our sandbox/docs used `RewardRedemption`.
- full integration uses `PointRate`, but our sandbox/docs used `RewardRate`.
- full integration uses event type `RECYCLING_APPROVED`.
- our sandbox/docs used `QR_RECYCLING_APPROVED`.
- full integration uses `REWARD_REDEEMED`.
- our sandbox/docs used `REWARD_RESERVED` and `REWARD_CANCELLED`.
- full integration reward flow deducts points as redeemed/claimed.
- our previous plan was reserve first, then complete or cancel/refund.
- full integration `Redemption.status` is string, not enum.
- string status can become messy later.
- full integration `PointsEventStatus` uses `POSTED`, while main backend currently uses `PENDING/SENT/FAILED`.
- this is not wrong, but team must decide the final naming.
- seed has rewards and point rates, but not full qr/recycling/redemption demo seed.
- need more local testing before trusting it.
- some modules are bigger than student 3 original plan, so merge risk is higher.

## database compare

### full integration database

- `RecyclingQrCode`
- `RecyclingSubmission`
- `PointRate`
- `RewardTier`
- `Reward`
- `Redemption`
- `RedemptionCooldown`
- `SuspiciousActivityLog`
- `PointsEvent.recyclingSubmissionId`
- `PointsEvent.redemptionId`
- `UploadedFile.recyclingSubmissionId`
- `UploadedFile.rewardId`

### sandbox / docs database

- `QRCode`
- `RecyclingTransaction`
- `RewardRate`
- `Reward`
- `RewardRedemption`
- `TransactionHistory`
- `AuditLog`
- `PointsEvent.recyclingTransactionId`
- `PointsEvent.rewardRedemptionId`

## what database is better

- full integration database is more complete for actual app features.
- because it supports manual submission, qr submission, proof image, anti gaming, reward image, leaderboard.
- sandbox database is cleaner and closer to simple student 3 plan.
- but sandbox is less feature complete.
- for real merge, i think full integration should be the main candidate.
- but we should clean the naming and reward redemption flow before production.

## what need improve

- decide final database vocabulary first.
- either use full integration names or sandbox/docs names, but not both.
- my suggestion: use full integration structure, because it is more complete.
- but improve it before merging into real backend.
- make `Redemption.status` an enum.
- decide if reward should be direct redeem or reserved first.
- if campus pickup is needed, use reserved/completed/cancelled.
- add unique/idempotency protection for points event:
  - one approved recycling submission should only create one points event.
  - one redemption should only create one deduction event.
- add indexes for wallet query:
  - `PointsEvent.userId + createdAt`
  - `PointsEvent.userId + eventType`
- add indexes for reward query:
  - `Reward.isActive + pointsRequired`
- confirm point event status naming:
  - keep `POSTED` or keep main backend `SENT`, but do not mix.
- run real local DB test using full integration migrations.
- run Postman tests for qr, recycling submission, reward redeem, anti gaming, leaderboard.

## merge safety

- do not directly copy full integration folder into main backend.
- do not commit full folder as-is.
- keep it as reference branch/folder first.
- test full integration in its own isolated database.
- after test, manually port the final selected schema and modules into main backend.
- use real Prisma migration for main backend.
- do not use `db push` for production merge.
- keep student 3 sandbox only for database compare/testing.

## cleanup folder plan

- keep `backend/`.
- keep `docs/`.
- keep `postman/`.
- keep `sdg-recycling-ecosystem-student-3/` for sandbox testing.
- keep `sdg-recycling-ecosystem-Full-Integration/` for review source.
- remove or archive old duplicate folders only after confirm:
  - `sdg-recycling-ecosystem-web/`
  - `sdg-recycling-ecosystem-student-3 (1)/`
  - `offline/`
  - `azure-static-test-site/`
  - `sdg-recycling-ecosystem-android_app_integration/`

## next step

- run full integration backend with isolated database.
- seed it.
- test full qr to recycling to points to reward flow.
- compare result with our sandbox database.
- then decide final database naming and merge plan.

## overall comment

- old student 3 work was not useful enough to merge directly.
- full integration is much better and worth reviewing seriously.
- but full integration is still not automatically production ready.
- the main issue now is database decision, not only code.
- once database naming and reward flow are decided, then code merge can be planned safely.
