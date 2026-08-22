# SDG Recycling API Contract

This is the shared contract for backend, web, and mobile integration.

## Base URLs

Local backend:

```text
http://localhost:5000/api/v1
```

Android emulator:

```text
http://10.0.2.2:5000/api/v1
```

Physical phone on same Wi-Fi:

```text
http://YOUR_LAPTOP_IP:5000/api/v1
```

Azure production:

```text
https://YOUR_AZURE_BACKEND_DOMAIN/api/v1
```

## Authentication

Most routes require a JWT bearer token.

```http
Authorization: Bearer <token>
```

Login request:

```http
POST /auth/login
Content-Type: application/json
```

```json
{
  "email": "student1@student.uow.edu.my",
  "password": "Password123!"
}
```

Register request:

```http
POST /auth/register
Content-Type: application/json
```

```json
{
  "name": "Student One",
  "email": "newstudent@student.uow.edu.my",
  "password": "Password123!"
}
```

Registration is restricted to `@uow.edu.my` and `@student.uow.edu.my` email addresses. Other domains are rejected with `400` and the message `"Registration is restricted to student.uow.edu.my or uow.edu.my email addresses."`

Seeded local accounts:

```text
admin@uow.edu.my / Password123!
student1@student.uow.edu.my / Password123!
student2@student.uow.edu.my / Password123!
student3@student.uow.edu.my / Password123!
```

## Response Shape

Successful responses normally return:

```json
{
  "data": {}
}
```

Errors normally return:

```json
{
  "error": {
    "message": "Error message here."
  }
}
```

Frontend and mobile should read `error.message` for user-facing error handling.

Requests with missing required fields, invalid field types, or unsupported enum values return `400 Bad Request` using the same error shape.

## Roles

```text
ADMIN   - manage missions, content, quizzes, badges, submissions, points list, recycling QR/point rates/review, rewards, leaderboard visibility, anti-gaming flags
STUDENT - view content, submit missions, attempt quizzes, view own progress, badges, points, submit/claim recycling, redeem rewards, view leaderboard
```

## Health

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | No | Check backend is running |
| GET | `/db-test` | No | Check backend can reach database |

## Auth

| Method | Path | Auth | Role | Purpose |
| --- | --- | --- | --- | --- |
| POST | `/auth/register` | No | Public | Create user |
| POST | `/auth/login` | No | Public | Login and receive token |
| GET | `/auth/me` | Yes | Any | Get current user |

## Missions

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| POST | `/missions` | ADMIN | Create mission |
| GET | `/missions` | Any logged-in user | List missions |
| GET | `/missions/:id` | Any logged-in user | Get mission |
| PATCH | `/missions/:id` | ADMIN | Update mission |
| POST | `/missions/:id/image` | ADMIN | Upload mission image |
| DELETE | `/missions/:id` | ADMIN | Archive/delete mission |
| POST | `/missions/:id/join` | STUDENT | Create an ongoing mission submission |
| POST | `/missions/:id/submit` | STUDENT | Submit mission proof |
| GET | `/missions/:id/submissions` | ADMIN | List mission submissions |

Create mission body:

```json
{
  "title": "Recycle 5 plastic bottles",
  "description": "Submit proof after recycling bottles.",
  "longDescription": "Collect, sort, and count recyclable bottles before submitting proof.",
  "imageUrl": "https://example.com/mission.jpg",
  "guide": [
    {
      "step": 1,
      "title": "Collect bottles",
      "description": "Gather clean recyclable bottles."
    }
  ],
  "targetQuantity": 5,
  "targetDays": null,
  "type": "QUANTITY_BASED",
  "startAt": "2026-07-22T00:00:00.000Z",
  "endAt": "2026-08-22T00:00:00.000Z",
  "submissionCap": 1,
  "points": 50,
  "autoApprove": false,
  "status": "ACTIVE",
  "isActive": true
}
```

`title`, `description`, `type`, `startAt`, `endAt`, `submissionCap`, `points`, and `autoApprove` are required when creating a mission. `endAt` must be later than `startAt`; otherwise the API returns `400 Bad Request` with `Invalid time window.`

Join mission response creates a submission with status `ONGOING`. Joining or submitting is allowed only while the mission is active, has status `ACTIVE`, and the current time is between `startAt` and `endAt`. Requests outside that window return `400 Bad Request`. Submit mission changes the submission to `PENDING_REVIEW`, or `APPROVED` when the mission has `autoApprove: true`. Points are awarded only when approved submissions complete the mission target, not merely when any single submission is approved.

Submit mission body:

```json
{
  "proofText": "I recycled 5 bottles.",
  "proofImageUrl": "https://example.com/proof.jpg",
  "quantity": 5,
  "uploadId": "uploaded-file-id"
}
```

## Submissions

Submission statuses:

```text
ONGOING
PENDING_REVIEW
APPROVED
REJECTED
```

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/submissions` | ADMIN | List all submissions |
| GET | `/submissions/me` | STUDENT | List my submissions |
| GET | `/submissions/:id` | Any logged-in user | Get submission |
| PATCH | `/submissions/:id/review` | ADMIN | Approve or reject |

Review body:

```json
{
  "status": "APPROVED",
  "reviewNote": "Looks good."
}
```

## Content

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| POST | `/content` | ADMIN | Create educational content |
| GET | `/content` | Any logged-in user | List content |
| GET | `/content/:id` | Any logged-in user | Get content |
| PUT | `/content/:id` | ADMIN | Update content |
| DELETE | `/content/:id` | ADMIN | Archive content |
| GET | `/content/:id/revisions` | ADMIN | List content revisions |

Create content body:

```json
{
  "title": "Why Recycling Matters",
  "summary": "A short card summary for mobile and web lists.",
  "body": "Educational content text here.",
  "imageUrl": "https://example.com/content.jpg",
  "estimatedReadMinutes": 5,
  "contentBlocks": [
    {
      "type": "paragraph",
      "text": "Educational content paragraph."
    }
  ],
  "tags": ["plastic", "sorting"],
  "status": "PUBLISHED"
}
```

Allowed content tags:

```text
plastic
paper
ewaste
food-waste
sorting
cleanliness
safety
general
```

## Quizzes

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| POST | `/quizzes` | ADMIN | Create quiz |
| GET | `/quizzes` | Any logged-in user | List quizzes |
| GET | `/quizzes/:id` | Any logged-in user | Get quiz |
| PATCH | `/quizzes/:id` | ADMIN | Update quiz |
| POST | `/quizzes/:id/questions` | ADMIN | Add question |
| PATCH | `/quizzes/:id/questions/:questionId` | ADMIN | Update question |
| DELETE | `/quizzes/:id/questions/:questionId` | ADMIN | Delete question |
| POST | `/quizzes/:id/attempts` | STUDENT | Submit quiz attempt |
| GET | `/quizzes/:id/attempts/me` | STUDENT | List my attempts |
| GET | `/quizzes/:id/attempts` | ADMIN | List quiz attempts |

Create quiz body:

```json
{
  "contentId": "content-id",
  "title": "Recycling Quiz",
  "passingScore": 4
}
```

Quiz scoring now uses number of correct answers, not percentage. Quizzes should have 5 to 10 questions, every question is worth 1 point, and `passingScore` must fit within the question count.

Add question body:

```json
{
  "questionText": "Which item can usually be recycled?",
  "options": ["Plastic bottle", "Food waste"],
  "correctAnswer": "Plastic bottle",
  "points": 1
}
```

Submit attempt body:

```json
{
  "answers": {
    "question-code-1": "Plastic bottle"
  },
  "timeSpentSeconds": 72
}
```

Submit attempt response:

```json
{
  "data": {
    "attempt": {},
    "result": {
      "score": 5,
      "totalQuestions": 5,
      "correctAnswers": 5,
      "accuracy": 100,
      "passed": true,
      "timeSpentSeconds": 72,
      "bestScore": 5,
      "previousBestScore": null,
      "isNewBestScore": false
    },
    "review": {
      "questions": []
    }
  }
}
```

## Progress

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/progress/me` | STUDENT | List my learning progress |
| GET | `/progress/content/:contentId/me` | STUDENT | Get my progress for content |
| PATCH | `/progress/content/:contentId/complete` | STUDENT | Mark content complete |
| GET | `/progress/content/:contentId` | ADMIN | List progress for content |

## Badges

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| POST | `/badges` | ADMIN | Create badge |
| GET | `/badges` | ADMIN | List badges |
| GET | `/badges/progress` | Any logged-in user | Get my badge progress |
| GET | `/badges/:id` | ADMIN | Get badge |
| PATCH | `/badges/:id` | ADMIN | Update badge |
| DELETE | `/badges/:id` | ADMIN | Deactivate badge |
| GET | `/badges/:id/awards` | ADMIN | List badge awards |

Create badge body:

```json
{
  "name": "Mission Starter",
  "description": "Complete your first mission.",
  "tier": "BRONZE",
  "criteriaType": "APPROVED_SUBMISSIONS",
  "criteriaValue": 1
}
```

Badge criteria types:

```text
MISSIONS_COMPLETED
QUIZZES_PASSED
CONTENT_COMPLETED
APPROVED_SUBMISSIONS
RECYCLING_APPROVED
```

## Points

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/points/me` | STUDENT | Get my points |
| GET | `/points` | ADMIN | List points events |

`GET /points/me` returns points events, `total`, and `lifetimeTotal`.

```json
{
  "data": {
    "events": [],
    "total": 40,
    "lifetimeTotal": 65
  }
}
```

`total` is the current spendable balance: it sums all active event types, including reward redemptions (negative) and refunds (positive). `lifetimeTotal` only sums positive-earning event types (`MISSION_COMPLETED`, `RECYCLING_APPROVED`, `ADMIN_ADJUSTMENT`) and is what the leaderboard ranks on — it does not decrease when a reward is redeemed.

Active point event types: `MISSION_COMPLETED`, `RECYCLING_APPROVED`, `REWARD_REDEEMED`, `REWARD_REFUNDED`, `ADMIN_ADJUSTMENT`. Older `MISSION_APPROVED` point events are treated as compatibility/history rows and are not part of the active total.

Mission completion rules:

```text
QUANTITY_BASED - approved quantity total reaches targetQuantity
STREAK_BASED   - approved submission count reaches targetDays
TIME_LIMITED   - at least one approved submission
```

Each student can receive only one active `MISSION_COMPLETED` point event per mission. For `MISSION_COMPLETED`, `submissionId` refers to the approved submission that completed the mission target. Similarly, each approved recycling submission produces at most one `RECYCLING_APPROVED` event, and each redemption produces at most one `REWARD_REDEEMED` and at most one `REWARD_REFUNDED` event, enforced by database constraints.

## Uploads

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| POST | `/uploads/mission-proof` | STUDENT | Upload mission proof file |
| POST | `/uploads/content-image` | ADMIN | Upload content image |
| POST | `/uploads/recycling-proof` | STUDENT | Upload recycling submission proof file |
| GET | `/uploads/mine` | STUDENT | List my uploads |
| GET | `/uploads/:id` | Any logged-in user | Get upload metadata |

Mission proof, content image, mission image, recycling proof, and reward image upload requests use multipart form data. The file field is `file`. Supported image types are JPEG, PNG, and WebP up to 5 MB. Reward images are uploaded through `POST /rewards/:id/image`, not the `/uploads` routes.

## Recycling

Recycling submissions can come from two sources: a manual student-entered submission, or scanning an admin-issued QR code. Both land in the same review queue; points are only awarded once an admin approves.

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/recycling/point-rates` | Any logged-in user | List points-per-kg by material |
| PUT | `/recycling/point-rates` | ADMIN | Update points-per-kg rates |
| POST | `/recycling/qr/issue` | ADMIN | Issue a signed recycling QR code |
| GET | `/recycling/qr` | ADMIN | List QR codes |
| GET | `/recycling/qr/:id` | ADMIN | Get a QR code |
| POST | `/recycling/qr/claim` | STUDENT | Claim a QR code, creating a pending submission |
| POST | `/recycling/qr/:id/invalidate` | ADMIN | Invalidate an unclaimed QR code |
| POST | `/recycling/submissions` | STUDENT | Create a manual recycling submission |
| GET | `/recycling/submissions/me` | STUDENT | List my recycling submissions |
| GET | `/recycling/submissions` | ADMIN | List all recycling submissions |
| GET | `/recycling/submissions/:id` | Owner or ADMIN | Get a recycling submission |
| PATCH | `/recycling/submissions/:id/review` | ADMIN | Approve or reject a submission |

Issue QR body:

```json
{
  "materialType": "Plastic",
  "estimatedWeightKg": 2,
  "expiresInMinutes": 60
}
```

The issue response includes a `claimPayload` string — pass it straight through as the body of `POST /recycling/qr/claim` (it already contains the signed `payload` and `signature`).

Create manual submission body:

```json
{
  "materialType": "Paper",
  "quantity": 3,
  "uploadId": "uploaded-file-id"
}
```

Review body:

```json
{
  "status": "APPROVED",
  "reviewNote": "Approved after evidence review."
}
```

Points for an approved submission are `floor(quantity * ratePerKg)`, capped by a daily per-student recycling point cap. QR codes expire after `expiresInMinutes` (default from `QR_DEFAULT_EXPIRY_MINUTES`) and cannot be reused once claimed.

## Rewards

Redemptions use a reserve-first flow: `POST /rewards/:id/redeem` deducts points immediately and reserves stock (status `RESERVED`). The student must collect the reward within three days. An admin marks it `COMPLETED` at pickup; after the deadline, the backend automatically changes it to `CANCELLED`, refunds the points, and restores the reserved quantity to reward stock.

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/rewards` | Any logged-in user | List active rewards |
| POST | `/rewards` | ADMIN | Create reward |
| PATCH | `/rewards/:id` | ADMIN | Update reward |
| DELETE | `/rewards/:id` | ADMIN | Deactivate reward |
| POST | `/rewards/:id/image` | ADMIN | Upload reward image |
| POST | `/rewards/:id/redeem` | STUDENT | Redeem (reserve) a reward |
| GET | `/rewards/redemptions/me` | STUDENT | List my redemptions |
| GET | `/rewards/redemptions` | ADMIN | List all redemptions |
| GET | `/rewards/redemptions/:id` | Owner or ADMIN | Get a redemption |
| POST | `/rewards/redemptions/:id/complete` | ADMIN | Mark a reserved redemption fulfilled |
| POST | `/rewards/redemptions/:id/cancel` | Owner or ADMIN | Cancel a reserved redemption and refund points |

Create reward body:

```json
{
  "name": "Reusable Water Bottle",
  "pointsRequired": 150,
  "stock": 15,
  "category": "Lifestyle",
  "tier": "small"
}
```

Redeem body:

```json
{
  "quantity": 1
}
```

Cooldown between redemptions of the same reward by the same student is 24 hours (72 hours for `large` tier rewards). Redeeming fails with `400` if the student's current point balance is below `pointsRequired * quantity`.

## Leaderboard

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/leaderboard` | Any logged-in user | Get the all-time points leaderboard |

Ranks students by `lifetimeTotal` (see Points above), so redeeming a reward does not change rank.

```json
{
  "data": {
    "timeframe": "all_time",
    "generated_at": "2026-08-03T07:06:27.555Z",
    "minimumApprovedRecyclingSubmissions": 3,
    "entries": [
      {
        "rank": 1,
        "full_name": "Student One",
        "lifetime_points": 225,
        "total_points": 225,
        "user_id": "USR002",
        "approved_recycling_submissions": 1
      }
    ]
  }
}
```

## Anti-Gaming

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/anti-gaming/me/status` | STUDENT | Get my daily/hourly recycling submission limits and remaining points |
| GET | `/anti-gaming/suspicious-activities` | ADMIN | List logged suspicious activity |
| PATCH | `/anti-gaming/users/:userId/flag` | ADMIN | Manually flag or unflag a user |

Flag body:

```json
{
  "flagged": true,
  "reason": "Manual review requested."
}
```

Recycling submissions are rate-limited per student (max submissions per hour, cooldown between submissions, and a daily recycling point cap). A flagged user (`suspiciousActivityFlagged: true`) is blocked from further recycling submissions until an admin unflags them.

## User Profile

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| PATCH | `/users/me` | Any logged-in user | Update my own profile (currently `name` only) |

## Account Management

Student accounts remain active until an administrator changes their status. Recycling inactivity does not automatically deactivate an account.

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| PATCH | `/admin/users/:userId/deactivate` | ADMIN | Manually deactivate an active student account |
| PATCH | `/admin/users/:userId/reactivate` | ADMIN | Manually reactivate a deactivated student account |

The deactivate endpoint accepts an optional reason:

```json
{
  "reason": "Deactivated upon the student's request."
}
```

## Environment Variables

Backend environments should include:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public
JWT_SECRET=use-a-real-secret
JWT_EXPIRES_IN=1d
POINTS_LEDGER_URL=
POINTS_LEDGER_TIMEOUT_MS=3000
QR_SIGNING_SECRET=use-a-real-secret
QR_DEFAULT_EXPIRY_MINUTES=15
FRONTEND_URL=http://localhost:9999
AZURE_STORAGE_CONNECTION_STRING=
AZURE_STORAGE_CONTAINER_MISSION_PROOFS=mission-proofs
AZURE_STORAGE_CONTAINER_CONTENT_IMAGES=content-images
AZURE_STORAGE_CONTAINER_MISSION_IMAGES=mission-images
AZURE_STORAGE_CONTAINER_RECYCLING_PROOFS=recycling-proofs
AZURE_STORAGE_CONTAINER_REWARD_IMAGES=reward-images
AZURE_STORAGE_BLOB_BASE_URL=
```

## Frontend and Mobile Rules

- Store the login token and attach it to every protected request.
- If the API returns `401`, send the user back to login.
- If the API returns `403`, show a permission error.
- Do not hardcode seeded IDs. Read IDs from list endpoints or Postman collection variables.
- Keep base API URL configurable for local and production.
- Web and mobile should call the same backend API paths.
