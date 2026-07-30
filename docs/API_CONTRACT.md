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
  "email": "student1@sdg.local",
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
  "email": "student1@example.com",
  "password": "Password123!"
}
```

Seeded local accounts:

```text
admin@sdg.local / Password123!
student1@sdg.local / Password123!
student2@sdg.local / Password123!
student3@sdg.local / Password123!
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

## Roles

```text
ADMIN   - manage missions, content, quizzes, badges, submissions, points list
STUDENT - view content, submit missions, attempt quizzes, view own progress, badges, points
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

Join mission response creates a submission with status `ONGOING`. Submit mission changes that submission to `PENDING_REVIEW`, or `APPROVED` when the mission has `autoApprove: true`.

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
```

## Points

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/points/me` | STUDENT | Get my points |
| GET | `/points` | ADMIN | List points events |

`GET /points/me` returns points events and `total`.

```json
{
  "data": {
    "events": [],
    "total": 40
  }
}
```

## Uploads

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| POST | `/uploads/mission-proof` | STUDENT | Upload mission proof file |
| POST | `/uploads/content-image` | ADMIN | Upload content image |
| GET | `/uploads/mine` | STUDENT | List my uploads |
| GET | `/uploads/:id` | Any logged-in user | Get upload metadata |

Mission proof, content image, and mission image upload requests use multipart form data. The file field is `file`. Supported image types are JPEG, PNG, and WebP up to 5 MB.

## Environment Variables

Backend environments should include:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public
JWT_SECRET=use-a-real-secret
JWT_EXPIRES_IN=1d
POINTS_LEDGER_URL=
POINTS_LEDGER_TIMEOUT_MS=3000
FRONTEND_URL=http://localhost:9999
AZURE_STORAGE_CONNECTION_STRING=
AZURE_STORAGE_CONTAINER_MISSION_PROOFS=mission-proofs
AZURE_STORAGE_CONTAINER_CONTENT_IMAGES=content-images
AZURE_STORAGE_CONTAINER_MISSION_IMAGES=mission-images
AZURE_STORAGE_BLOB_BASE_URL=
```

## Frontend and Mobile Rules

- Store the login token and attach it to every protected request.
- If the API returns `401`, send the user back to login.
- If the API returns `403`, show a permission error.
- Do not hardcode seeded IDs. Read IDs from list endpoints or Postman collection variables.
- Keep base API URL configurable for local and production.
- Web and mobile should call the same backend API paths.
