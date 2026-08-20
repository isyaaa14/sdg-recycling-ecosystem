# Azure Burp Suite Security Test Playbook

## 1. Purpose

This playbook provides a short, repeatable Burp Suite Community Edition test of the SDG Recycling Ecosystem's Azure environment.

The reduced scope covers only:

1. authentication and student-role authorization; and
2. badge theft, IDOR, and privilege-escalation resistance.

Local testing, mission validation, badge idempotency, automated scanning, load testing, and brute-force testing are outside this playbook.

## 2. Authorized target

```text
Environment: Azure
Base URL: https://app-sdg-backend-fwcvbshjeugbcuea.southeastasia-01.azurewebsites.net/api/v1
Protocol: HTTPS
Port: 443
```

Only run these tests with explicit authorization and the dedicated test account. The requests are low-volume and are sent manually from Burp Repeater.

Stop immediately and preserve the evidence if an administrator-only request unexpectedly succeeds.

## 3. Test account

Use this approved Azure student identity:

```text
0135556@student.uow.edu.my
```

Enter its current password at test time. Never save the plaintext password in this playbook, Git, screenshots, exported Burp projects, or shared Postman environments.

Never expose a complete JWT in presentation material. Redact it as follows:

```text
Authorization: Bearer eyJhbGciOi...REDACTED...abc123
```

## 4. Test objectives

The playbook verifies that:

1. Azure health responds successfully.
2. The authorized test student can authenticate and receive a JWT.
3. A protected administrator endpoint rejects a request without a token.
4. A valid student JWT cannot access an administrator endpoint.
5. A student cannot enumerate badge-award records.
6. Injecting another `userId` does not expose another student's badge progress.
7. A student cannot modify badge requirements.

## 5. Configure Burp Suite Community Edition

### 5.1 Start Burp

1. Launch Burp Suite Community Edition on Windows.
2. Select **Temporary project**.
3. Select **Use Burp defaults**.
4. Click **Start Burp**.
5. Open **Proxy > Proxy settings**.
6. Confirm that `127.0.0.1:8080` is running under Proxy listeners.
7. Open **Proxy > Intercept** and set interception to **Off** initially.

Burp's embedded browser is already configured for its proxy. Burp Repeater can also send HTTPS requests directly to Azure.

### 5.2 Create the two Repeater groups

Use this exact layout:

| Repeater group | Color | Tabs in order |
| --- | --- | --- |
| `Azure - Auth` | Blue | `Health Check`, `Student Login`, `Auth - No Token`, `Auth - Student` |
| `Azure - Badge Theft Simulation` | Yellow | `Access confidential award records`, `Badge progress baseline`, `Impersonate another student`, `Lower the badge requirement` |

To create a group:

1. Open **Repeater**.
2. Click the **+** button.
3. Select **Create tab group**.
4. Enter the group name from the table.
5. Choose the indicated color.
6. Select any existing tabs that belong in the group.
7. Click **Create**.
8. Double-click each tab header to apply the exact tab name.

To move an existing tab, right-click the tab and select **Add tab to group**, followed by the destination group.

Send every request individually and in the documented order. Do not use **Send group in parallel**.

## 6. Set the Azure Repeater target

For every tab in both groups, click the pencil beside Repeater's target and configure:

```text
Protocol: HTTPS
Host: app-sdg-backend-fwcvbshjeugbcuea.southeastasia-01.azurewebsites.net
Port: 443
```

Every request must also contain:

```http
Host: app-sdg-backend-fwcvbshjeugbcuea.southeastasia-01.azurewebsites.net
```

Changing only the `Host` header is insufficient. The Repeater target itself must point to the Azure host over HTTPS.

Every raw request must end with a blank line after its final header. Requests with JSON bodies require a blank line between the headers and JSON.

## 7. Group 1: Azure authentication and authorization

### AUTH-00: Health Check

#### Explanation

This confirms that Burp can reach the correct Azure service before authentication testing begins.

#### Objective

Verify Azure availability and the Repeater target configuration.

#### Request

Use the `Health Check` tab:

```http
GET /api/v1/health HTTP/1.1
Host: app-sdg-backend-fwcvbshjeugbcuea.southeastasia-01.azurewebsites.net
Connection: close


```

#### Expected result

```http
HTTP/1.1 200 OK
```

```json
{
  "data": {
    "status": "ok"
  }
}
```

#### Pass criteria

- Status is `200`.
- `data.status` is `ok`.
- The response comes from the intended Azure hostname.

### AUTH-01: Student Login

#### Explanation

The student submits valid credentials and receives an Azure JWT. This token represents the student's identity and role in all later tests.

#### Objective

Verify that the dedicated Azure test account can authenticate.

#### Request

Use the `Student Login` tab and enter the current password at runtime:

```http
POST /api/v1/auth/login HTTP/1.1
Host: app-sdg-backend-fwcvbshjeugbcuea.southeastasia-01.azurewebsites.net
Content-Type: application/json
Connection: close

{
  "email": "0135556@student.uow.edu.my",
  "password": "<ENTER_TEST_PASSWORD_AT_RUNTIME>"
}
```

#### Expected result

```text
HTTP/1.1 200 OK
data.token is present
data.user.email is 0135556@student.uow.edu.my
data.user.role is STUDENT
```

Copy the returned token temporarily as `<AZURE_STUDENT_TOKEN>`. Redact it from all evidence.

#### Pass criteria

- Login returns `200`.
- The returned user is the intended test account.
- The returned role is `STUDENT`.
- A JWT is present.

### AUTH-02: Protected endpoint without a token

#### Explanation

Authentication must be required before a caller can access the administrator badge list.

#### Objective

Confirm that a request without a JWT is rejected.

#### Request

Use the `Auth - No Token` tab:

```http
GET /api/v1/badges HTTP/1.1
Host: app-sdg-backend-fwcvbshjeugbcuea.southeastasia-01.azurewebsites.net
Connection: close


```

#### Expected result

```http
HTTP/1.1 401 Unauthorized
```

```json
{
  "error": {
    "message": "Missing or invalid Authorization header."
  }
}
```

#### Pass criteria

- Status is `401`.
- No badge list is returned.
- The response does not expose a stack trace or internal details.

### AUTH-03: Student attempts administrator access

#### Explanation

Authentication alone must not grant administrator permissions. This request uses a valid student JWT against the administrator-only badge list.

#### Objective

Verify vertical role-based access control.

#### Request

Use the `Auth - Student` tab:

```http
GET /api/v1/badges HTTP/1.1
Host: app-sdg-backend-fwcvbshjeugbcuea.southeastasia-01.azurewebsites.net
Authorization: Bearer <AZURE_STUDENT_TOKEN>
Connection: close


```

#### Expected result

```http
HTTP/1.1 403 Forbidden
```

```json
{
  "error": {
    "message": "You do not have permission to perform this action."
  }
}
```

#### Pass criteria

- Status is `403`.
- No administrator badge list is returned.
- The valid student session remains usable for student endpoints.

#### Presentation explanation

> The first request has no identity and is rejected with 401. The second has a valid student identity but lacks the administrator role, so it is rejected with 403.

## 8. Group 2: Badge theft, IDOR, and privilege escalation

The examples use badge `BDG010`, named `First Approval`.

### BDG-01: Access confidential award records

#### Explanation

A student who learns a badge ID may try forced browsing to enumerate everyone who earned that badge.

#### Objective

Verify that badge-award records remain restricted to administrators.

#### Request

Use `Access confidential award records`:

```http
GET /api/v1/badges/BDG010/awards HTTP/1.1
Host: app-sdg-backend-fwcvbshjeugbcuea.southeastasia-01.azurewebsites.net
Authorization: Bearer <AZURE_STUDENT_TOKEN>
Connection: close


```

#### Expected result

```http
HTTP/1.1 403 Forbidden
```

#### Pass criteria

- Status is `403`.
- No usernames, user IDs, award dates, or award records are returned.

### BDG-02: Badge progress baseline

#### Explanation

The student's legitimate progress response provides a baseline for the subsequent IDOR attempt.

#### Objective

Record the authenticated student's own badge progress.

#### Request

Use `Badge progress baseline`:

```http
GET /api/v1/badges/progress HTTP/1.1
Host: app-sdg-backend-fwcvbshjeugbcuea.southeastasia-01.azurewebsites.net
Authorization: Bearer <AZURE_STUDENT_TOKEN>
Connection: close


```

#### Expected result

```text
HTTP/1.1 200 OK
The response contains the authenticated student's earned and locked badges.
```

Send the response to Burp Comparer or save a redacted copy.

#### Pass criteria

- Status is `200`.
- Badge progress is returned for the authenticated test student.
- No other student's identity or progress is exposed.

### BDG-03: Impersonate another student through IDOR

#### Explanation

The student injects another user ID into the query string. A vulnerable implementation might trust this value and return the target student's progress. The secure implementation derives identity from the JWT.

#### Objective

Verify that caller-controlled `userId` input cannot override the authenticated identity.

#### Request

Use `Impersonate another student`:

```http
GET /api/v1/badges/progress?userId=USR003 HTTP/1.1
Host: app-sdg-backend-fwcvbshjeugbcuea.southeastasia-01.azurewebsites.net
Authorization: Bearer <AZURE_STUDENT_TOKEN>
Connection: close


```

#### Expected result

```text
HTTP/1.1 200 OK
The response still represents the authenticated test student's progress.
```

Compare this response with `Badge progress baseline` in Burp Comparer.

#### Pass criteria

- The injected `userId` does not select `USR003`.
- No other student's badge progress is returned.
- The baseline and injected requests represent the same authenticated user.

If the responses differ because badge evaluation updated a timestamp or awarded a newly qualified badge, resend the baseline once and compare again. The user represented by both responses must still be the authenticated test student.

### BDG-04: Lower the badge requirement

#### Explanation

The student attempts vertical privilege escalation by directly calling the administrator badge-update endpoint.

#### Objective

Verify that a student cannot modify badge criteria.

#### Safety control

`BDG010` already uses `criteriaValue: 1`. The request sends the existing value, limiting impact even if authorization unexpectedly fails.

#### Request

Use `Lower the badge requirement`:

```http
PATCH /api/v1/badges/BDG010 HTTP/1.1
Host: app-sdg-backend-fwcvbshjeugbcuea.southeastasia-01.azurewebsites.net
Authorization: Bearer <AZURE_STUDENT_TOKEN>
Content-Type: application/json
Connection: close

{
  "criteriaValue": 1
}
```

#### Expected result

```http
HTTP/1.1 403 Forbidden
```

#### Pass criteria

- Status is `403`.
- The badge is not modified.
- No administrator operation is performed.
- The response does not expose internal errors.

#### Presentation explanation

> The student knows the badge ID and attempts recipient enumeration, another-user impersonation, and an administrator update. Recipient data remains protected, badge progress stays bound to the JWT, and modification is rejected.

## 9. Results summary

| Test ID | Repeater tab | Expected result | Security property |
| --- | --- | --- | --- |
| AUTH-00 | `Health Check` | `200`, status `ok` | Azure availability |
| AUTH-01 | `Student Login` | `200`, student JWT | Authentication |
| AUTH-02 | `Auth - No Token` | `401` | Protected endpoint |
| AUTH-03 | `Auth - Student` | `403` | Vertical RBAC |
| BDG-01 | `Access confidential award records` | `403` | Recipient privacy and RBAC |
| BDG-02 | `Badge progress baseline` | `200`, own progress | Authorized self-access |
| BDG-03 | `Impersonate another student` | Own progress only | IDOR resistance |
| BDG-04 | `Lower the badge requirement` | `403`, unchanged | Privilege-escalation resistance |

The full suite passes only when every row produces its expected result.

## 10. Evidence collection

Record the following for every request:

| Field | Example |
| --- | --- |
| Test ID | `BDG-03` |
| Date and time | Include timezone |
| Environment | Azure |
| HTTP method and path | `GET /api/v1/badges/progress?userId=USR003` |
| Account role | Student |
| Expected result | Authenticated student's progress only |
| Actual result | Brief response summary |
| Outcome | Pass or Fail |
| Evidence | Redacted screenshot filename |

For presentation evidence:

1. Keep the Repeater group and tab name visible.
2. Show the request method, path, and Azure target.
3. Show the response status and relevant JSON.
4. Blur or crop the password and JWT.
5. Capture the Comparer result for `BDG-02` and `BDG-03`.

## 11. Stop conditions and findings

Stop the test and preserve evidence if:

- `Auth - No Token` returns protected data;
- `Auth - Student` returns the administrator badge list;
- `Access confidential award records` returns recipient information;
- `Impersonate another student` returns another user's progress;
- `Lower the badge requirement` returns `2xx`; or
- a `500` response exposes a stack trace, database details, secrets, or internal paths.

Do not attempt additional exploitation after confirming a failure.

## 12. Troubleshooting

### Burp reports that the header block has no blank line

Place the cursor after the final header and press Enter twice.

### The Azure request goes to localhost

Click the pencil beside Repeater's target and change the actual target to Azure HTTPS port `443`. Editing only the `Host` header does not change the connection destination.

### Azure returns `401` after login previously succeeded

The JWT may have expired. Return to `Student Login`, authenticate again, and replace the token in the remaining tabs.

### The IDOR responses differ

Badge evaluation may update legitimate progress during a request. Resend the baseline and compare it again. Confirm that neither response represents the injected user.

### Burp tabs appear on multiple rows

This is normal in wrapped view. Group membership is indicated by the shared group color and folder header.

## 13. Cleanup

1. Confirm that `BDG010` was not modified.
2. Redact JWTs and passwords from all retained screenshots.
3. Delete unredacted evidence.
4. Close the temporary Burp project so captured credentials and tokens are not retained.
5. Rotate the test-account password if it was exposed during preparation or presentation.
6. Store only the redacted results summary and approved evidence.

## 14. Short presentation sequence

Use this order for a concise demonstration:

1. `Health Check`: Azure returns `200`.
2. `Student Login`: Azure authenticates the test student.
3. `Auth - No Token`: the protected badge list returns `401`.
4. `Auth - Student`: the same endpoint returns `403` for a student.
5. `Access confidential award records`: recipient enumeration returns `403`.
6. `Badge progress baseline`: show legitimate self-access.
7. `Impersonate another student`: injected `userId` still returns the caller's progress.
8. `Lower the badge requirement`: the administrator operation returns `403`.

Closing statement:

> The Azure API requires authentication, enforces the student's role, protects badge-recipient data, binds badge progress to the JWT identity, and blocks unauthorized badge modification.
