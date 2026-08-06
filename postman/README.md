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

Then test the mobile write flow:

1. `Uploads / Upload Mission Proof`
2. `Missions / Join Mission`
3. `Missions / Submit Mission`
4. `Quizzes / Submit Attempt`

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

## Notes

- Upload testing requires Azurite/Azure storage configuration and `testFilePath` pointing to a local JPEG, PNG, or WebP file.
- Quiz scoring uses number of correct answers, not percentage. A 5-question quiz with `passingScore: 4` means 4 correct answers are needed to pass.
- Some create requests can return `409` if a test with the same slug or overlapping mission window has already run.
