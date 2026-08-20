# Azure Burp Suite Copy-and-Paste Playbook

## Purpose

This portable bundle contains raw HTTP request files for Burp Suite Community Edition. It covers only the authorized Azure tests for:

- authentication and student-role authorization; and
- badge theft, IDOR, and privilege-escalation resistance.

The `.txt` files are intended for copy and paste into Burp Repeater. They do not contain a live password or JWT.

## Target

```text
Protocol: HTTPS
Host: app-sdg-backend-fwcvbshjeugbcuea.southeastasia-01.azurewebsites.net
Port: 443
Base path: /api/v1
```

## Approved test identity

```text
Email: 0135556@student.uow.edu.my
Password: enter the current password at runtime
Role: STUDENT
```

Do not save the password or complete JWT in this folder, Git, screenshots, or reports.

## Folder layout

```text
azure-security-playbook/
|-- PLAYBOOK.md
|-- VARIABLES.txt
|-- 01_Azure_Auth/
|   |-- 01_Health_Check.txt
|   |-- 02_Student_Login.txt
|   |-- 03_Auth_No_Token.txt
|   `-- 04_Auth_Student.txt
`-- 02_Azure_Badge_Theft_Simulation/
    |-- 01_Access_Confidential_Award_Records.txt
    |-- 02_Badge_Progress_Baseline.txt
    |-- 03_Impersonate_Another_Student.txt
    `-- 04_Lower_Badge_Requirement.txt
```

## Create the Burp groups

Create these two Repeater tab groups:

| Burp group | Color | Tabs in order |
| --- | --- | --- |
| `Azure - Auth` | Blue | `Health Check`, `Student Login`, `Auth - No Token`, `Auth - Student` |
| `Azure - Badge Theft Simulation` | Yellow | `Access confidential award records`, `Badge progress baseline`, `Impersonate another student`, `Lower the badge requirement` |

In Repeater, click **+ > Create tab group**, enter the group name, choose the color, and add the relevant tabs.

## Import a request by copy and paste

For each `.txt` file:

1. Open the file in Notepad or another plain-text editor.
2. Copy the complete request.
3. In Burp Repeater, click **+ > HTTP** to create a blank request.
4. Select the **Raw** request view.
5. Paste the request.
6. Click the pencil beside Repeater's target and set:

```text
HTTPS
app-sdg-backend-fwcvbshjeugbcuea.southeastasia-01.azurewebsites.net
443
```

7. Rename the tab according to the group table.
8. Add the tab to its group.
9. Confirm that there is a blank line after the final header. Burp displays a warning if it is missing.
10. Replace any placeholder before clicking **Send**.

Raw `.txt` files are the portable source of truth. Direct request-file import can vary by Burp version, but pasting raw HTTP into Repeater works reliably.

## Placeholder workflow

### Student login

Open `01_Azure_Auth/02_Student_Login.txt` and replace:

```text
<ENTER_TEST_PASSWORD_AT_RUNTIME>
```

Send the request and confirm:

```text
HTTP 200
data.user.role = STUDENT
data.token is present
```

Copy only the token value.

### Authenticated requests

In every request containing:

```text
<AZURE_STUDENT_TOKEN>
```

replace the placeholder with the token returned by the login request.

If the token expires, log in again and update all authenticated tabs.

## Run order and expected results

### Group 1: Azure - Auth

#### AUTH-00: Health Check

File: `01_Azure_Auth/01_Health_Check.txt`

Objective: confirm that Burp is targeting the correct Azure service.

Expected:

```text
HTTP 200
data.status = ok
```

**Presentation notes**

- **Show:** The Azure hostname, `GET /api/v1/health`, and the `200 OK` response.
- **Say:** “This confirms that Burp is connected to the correct Azure backend. The following results therefore come from the live test environment rather than localhost.”
- **Key point:** This is a connectivity check, not a security finding.

#### AUTH-01: Student Login

File: `01_Azure_Auth/02_Student_Login.txt`

Objective: authenticate the approved test student and obtain an Azure JWT.

Expected:

```text
HTTP 200
data.user.email = 0135556@student.uow.edu.my
data.user.role = STUDENT
data.token is present
```

**Presentation notes**

- **Show:** The test email, `200 OK`, and `role: STUDENT`. Hide the password and token.
- **Say:** “The dedicated test account authenticates successfully, and Azure issues a JWT identifying this caller specifically as a student.”
- **Key point:** This same student JWT is used for every later authorization test.

#### AUTH-02: No Token

File: `01_Azure_Auth/03_Auth_No_Token.txt`

Objective: verify that the administrator badge list requires authentication.

Expected:

```text
HTTP 401
Missing or invalid Authorization header.
No badge list is returned.
```

**Presentation notes**

- **Show:** That the request has no `Authorization` header and receives `401 Unauthorized`.
- **Say:** “Without a token, the API cannot identify the caller, so it rejects the protected endpoint with 401.”
- **Key point:** `401` means authentication is missing or invalid.

#### AUTH-03: Student Role

File: `01_Azure_Auth/04_Auth_Student.txt`

Objective: verify that a valid student cannot access the administrator badge list.

Expected:

```text
HTTP 403
You do not have permission to perform this action.
No badge list is returned.
```

**Presentation notes**

- **Show:** The valid student `Authorization` header, with its token redacted, and the `403 Forbidden` response.
- **Say:** “The token is valid, but the account has the student role. The backend recognizes the user and blocks the administrator-only action.”
- **Key point:** `403` proves authorization is checked separately from authentication.

### Group 2: Azure - Badge Theft Simulation

#### BDG-01: Confidential Award Records

File: `02_Azure_Badge_Theft_Simulation/01_Access_Confidential_Award_Records.txt`

Objective: verify that a student cannot enumerate users who earned badge `BDG010`.

Expected:

```text
HTTP 403
No award records or student information is returned.
```

**Presentation notes**

- **Show:** The known badge ID `BDG010` in the URL and the `403 Forbidden` response.
- **Say:** “Knowing a badge ID does not grant access to its recipient list. The student cannot enumerate who earned this badge.”
- **Key point:** This protects recipient privacy and prevents forced browsing of administrator data.

#### BDG-02: Badge Progress Baseline

File: `02_Azure_Badge_Theft_Simulation/02_Badge_Progress_Baseline.txt`

Objective: record the authenticated student's legitimate badge progress.

Expected:

```text
HTTP 200
The authenticated student's earned and locked badges are returned.
```

Send this response to Burp Comparer or save a redacted copy.

**Presentation notes**

- **Show:** The normal `/badges/progress` path and a small identifiable portion of the student's earned or locked badge state.
- **Say:** “This is the legitimate baseline. A student is allowed to view their own badge progress.”
- **Key point:** Save this response because the next test changes only the requested user ID.

#### BDG-03: Impersonate Another Student

File: `02_Azure_Badge_Theft_Simulation/03_Impersonate_Another_Student.txt`

Objective: test whether `userId=USR003` can override the identity in the JWT.

Expected:

```text
HTTP 200
The response still represents the authenticated test student.
No USR003 progress is exposed.
```

Compare the response with BDG-02. If badge evaluation updated legitimate progress, resend the baseline and compare again. Both requests must still represent the authenticated test account.

**Presentation notes**

- **Show:** The added `?userId=USR003` parameter, followed by the Burp Comparer result against the baseline.
- **Say:** “I attempted to impersonate another user by injecting their ID. The backend ignores that caller-controlled identity and continues using the identity inside the JWT.”
- **Key point:** A `200` is expected here. The test passes because the response remains the logged-in student's data, not because access was denied.

#### BDG-04: Lower the Badge Requirement

File: `02_Azure_Badge_Theft_Simulation/04_Lower_Badge_Requirement.txt`

Objective: verify that a student cannot call the administrator badge-update endpoint.

Safety: badge `BDG010` already has `criteriaValue: 1`, so the request uses the existing value.

Expected:

```text
HTTP 403
The badge is not modified.
```

**Presentation notes**

- **Show:** The `PATCH` method, administrator badge endpoint, student token, request body, and `403 Forbidden` response.
- **Say:** “The student directly calls the administrator update endpoint in an attempt to change badge requirements. The server rejects the operation before any update occurs.”
- **Key point:** This is a vertical privilege-escalation test. The payload uses the badge's existing value as an additional production safety measure.

## Pass/fail summary

| Test | Expected |
| --- | --- |
| AUTH-00 | `200` |
| AUTH-01 | `200`, student JWT |
| AUTH-02 | `401` |
| AUTH-03 | `403` |
| BDG-01 | `403` |
| BDG-02 | `200`, own progress |
| BDG-03 | `200`, still own progress |
| BDG-04 | `403`, unchanged |

The suite passes only when all eight results match.

## Stop conditions

Stop immediately and retain redacted evidence if:

- a request without a token returns protected data;
- the student receives the administrator badge list;
- the student receives badge-award records;
- the injected `userId` returns another student's progress;
- the badge PATCH returns `2xx`; or
- a `500` response exposes internal details.

Do not continue exploiting an unexpected success.

## Evidence checklist

For every test, capture:

- Repeater group and tab name;
- Azure target;
- HTTP method and path;
- response status;
- relevant response message;
- expected versus actual result; and
- pass or fail.

Blur the password and JWT before sharing screenshots.

## Cleanup

1. Confirm that `BDG010` was not modified.
2. Delete unredacted screenshots.
3. Close the temporary Burp project.
4. Do not add a live JWT or password to the request files.
5. Rotate the test password if it was exposed.
