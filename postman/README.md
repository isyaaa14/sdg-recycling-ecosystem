# SDG Recycling Backend Postman Tests

This folder is the shared Postman workspace for the backend mounted from `backend/src/app.js`.

## Files

- `postman_collection.json` - collection for the live `/api/v1` routes.
- `postman_environment_local.json` - local environment for `http://localhost:5000`.
- `postman_environment_shared.json` - deployed/shared environment template.
- `sample_payloads.json` - copy-paste request bodies for manual tests.

## Import

1. Import `postman_collection.json`.
2. Import either `postman_environment_local.json` or `postman_environment_shared.json`.
3. Select the imported environment.
4. Start the backend and seed demo data.

Seeded users all use `Password123!`:

- admin: `admin@sdg.local`
- student: `student1@sdg.local`
- student: `student2@sdg.local`
- student: `student3@sdg.local`

## Recommended Smoke Order

Run these first:

1. `Health / Backend Health`
2. `Health / Database Check`
3. `Auth / Login Admin`
4. `Auth / Login Student 1`
5. `Missions / List Missions - Student Active`
6. `Content / List Content - Student Published`
7. `Quizzes / List Quizzes`
8. `Progress / List My Progress`
9. `Badges / Badge Progress - Student`
10. `Points / My Points - Student`

Then test the mobile write flows:

1. `Uploads / Upload Mission Proof`
2. `Missions / Join Mission`
3. `Missions / Submit Mission`
4. `Quizzes / Submit Attempt`
5. `Recycling / Create Manual Recycling Submission - Student`
6. `Recycling / Review Recycling Submission - Admin`

## Folder 10 UAT Session Guide

Folder `10 - UAT Demo Walkthrough (Questionnaire-Aligned)` is now designed for live UAT sessions with one real tester account. It no longer registers a throwaway tester on every run.

### What The Dev Sets Before The Session

In the active Postman environment, fill these once:

```text
uatTesterEmail=<real tester student email>
uatTesterPassword=<real tester password>
```

Clear these session outputs before a new session:

```text
studentToken
uatStudentUserId
uatSessionCode
uatMissionId
uatMissionTitle
uatMissionStartAt
uatMissionEndAt
uatSubmissionId
uatRecyclingSubmissionId
uatBaselinePoints
uatLatestPoints
uatBaselinePointEventCount
uatLatestPointEventCount
uatBaselineMissionSubmissionCount
uatLatestMissionSubmissionCount
uatBaselineRecyclingSubmissionCount
uatLatestRecyclingSubmissionCount
uatMissionSubmissionCreatedThisSession
```

Do not clear `uatTesterEmail` or `uatTesterPassword` unless changing tester.

### Sample UAT Mission

Folder 10 includes `Setup: Create Dedicated UAT Mission - Admin (Run Once Per Session)`. Run it after `Setup: Login Admin`.

Sample body:

```json
{
  "title": "UAT Recycling Mission {{uatSessionCode}}",
  "description": "Dedicated mission for live UAT tester walkthrough. Created from Postman folder 10.",
  "longDescription": "Used during UAT sessions to verify student mission submission, duplicate prevention, admin review, points ledger updates, and live data visibility using one real tester account.",
  "type": "TIME_LIMITED",
  "startAt": "{{uatMissionStartAt}}",
  "endAt": "{{uatMissionEndAt}}",
  "submissionCap": 1,
  "points": 10,
  "autoApprove": false,
  "status": "ACTIVE",
  "isActive": true,
  "guide": [
    {
      "step": 1,
      "title": "Prepare recyclable item",
      "description": "Tester prepares one recyclable or e-waste item for the UAT proof."
    },
    {
      "step": 2,
      "title": "Submit proof",
      "description": "Tester submits text proof through the mission endpoint."
    },
    {
      "step": 3,
      "title": "Admin review",
      "description": "Admin approves the pending submission during the UAT walkthrough."
    }
  ]
}
```

The request pre-request script auto-fills:

```text
uatSessionCode=Date.now()
uatMissionStartAt=now minus 5 minutes
uatMissionEndAt=now plus 30 days
```

The response test stores the generated mission ID into `uatMissionId`, which the rest of folder 10 uses. One mission is enough for one UAT session because it proves student submission, duplicate prevention, admin review, points update, and live list visibility.

If mission creation returns `409`, another active mission of the same type overlaps that date window. For the session, either archive the conflicting UAT mission, change the type/window, or manually set `uatMissionId` to an already-created active UAT mission that accepts submissions now.

### How Folder 10 Sticks To One Tester

`Setup: Login Live UAT Tester` uses:

```json
{
  "email": "{{uatTesterEmail}}",
  "password": "{{uatTesterPassword}}"
}
```

On success it stores:

```text
studentToken
uatStudentUserId
uatTesterDisplayName
uatTesterEmailResolved
```

Every later student request uses `Bearer {{studentToken}}`, so the whole folder runs as the same live tester. The login test also checks `uatStudentUserId`: if the environment was already bound to one tester and login returns another tester ID, the request fails and tells the dev to clear `uatStudentUserId` only when intentionally changing tester.

### How To Run The UAT Session

Use this order during the session:

1. Select the shared or local environment.
2. Enter `uatTesterEmail` and `uatTesterPassword`.
3. Clear the session output variables listed above.
4. Run `Setup: Login Admin`.
5. Run `Setup: Create Dedicated UAT Mission - Admin (Run Once Per Session)`.
6. Confirm `uatMissionId` is populated.
7. Run `Setup: Login Live UAT Tester`.
8. Confirm `uatStudentUserId` is populated and matches the real tester.
9. Run `Setup: Verify Dedicated UAT Mission - Student`.
10. Run the baseline capture requests for points, mission submissions, and recycling submissions.
11. Continue folder 10 top-to-bottom.
12. After each create/approve action, show the matching GET verification request as live evidence.

### What The Dev Should Say During UAT

Use this explanation:

```text
For this UAT session, we are using your real tester account instead of creating a fake user every run. We enter your tester email and password once in Postman. The login step captures your real user ID and stores it as uatStudentUserId. All student requests after this use the same student token, so every action belongs to the same tester throughout the session.

Before changing data, we capture your current points, existing mission submissions, and existing recycling submissions. After each action, we call the API again to prove the live data changed in the backend, not just in the immediate response.

This session uses one dedicated UAT mission. The first mission submission should create a pending submission. The second submission should be rejected as a duplicate. Admin approval should update the submission status and emit points. Then we verify the same result from both student and admin list views.
```

### What To Record In The UAT Questionnaire

For each test case, record:

```text
tester email
uatStudentUserId
uatMissionId
request name / test case ID
expected status
actual status
created submission ID, if any
created recycling submission ID, if any
points before and after, where relevant
pass/fail
remarks
```

### Repeating A Session

For a clean repeat, create a fresh UAT mission or use a different tester account. If the same tester reruns the same one-submission mission, `TC-01-001` may return `409`, which is valid duplicate-prevention behavior, but the admin approve flow will not be a fresh walkthrough unless there is a pending submission.

## Current Route Groups

The collection targets these mounted route groups:

- `/auth`
- `/missions`
- `/submissions`
- `/content`
- `/quizzes`
- `/progress`
- `/badges`
- `/points`
- `/uploads`
- `/recycling`
- `/rewards`
- `/leaderboard`
- `/anti-gaming`
- `/users`

## Notes

- Upload testing requires Azurite/Azure storage configuration and `testFilePath` pointing to a local JPEG, PNG, or WebP file.
- Quiz scoring uses number of correct answers, not percentage. A 5-question quiz with `passingScore: 4` means 4 correct answers are needed to pass.
- Some create requests can return `409` if a test with the same slug or overlapping mission window has already run.
