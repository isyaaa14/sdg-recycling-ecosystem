# SDG Recycling Android App

Android student client for the SDG Recycling Ecosystem, built with Kotlin and Jetpack Compose. It includes authentication, missions, proof submission, learning content, quizzes, recycling and QR flows, points, badges, rewards, leaderboards, notifications, and offline support.

## Requirements

- Android Studio with Android SDK 36
- JDK 11 or a compatible JDK configured by Android Studio
- Android device or emulator running API 26+
- A running SDG backend

## Open and run

1. Start the backend from the repository root with `docker compose up -d --build`.
2. Open the `mobile-app/` directory in Android Studio.
3. Let Gradle sync and install any requested SDK components.
4. Configure the backend URL as described below.
5. Select an emulator/device and run the `app` configuration.

Command-line builds are also available from `mobile-app/`:

```bash
./gradlew assembleDebug
./gradlew test
```

On Windows PowerShell use `./gradlew.bat assembleDebug` and `./gradlew.bat test`.

## Backend URL

The API repositories read a string resource named `backend_base_url`. Set it to a URL ending in `/api/v1/` (the trailing slash is required by the HTTP client).

For the standard Android emulator:

```xml
<string name="backend_base_url">http://10.0.2.2:5000/api/v1/</string>
```

For a physical phone, replace `10.0.2.2` with the development computer's LAN IP. The phone and computer must share a network, and the firewall must allow port `5000`. Never use `localhost` on the emulator or phone to reach a backend running on the computer.

For a deployed backend, use its HTTPS `/api/v1/` URL.

## Demo login

After the backend is seeded, use one of these student accounts with `Password123!`:

- `student1@student.uow.edu.my`
- `student2@student.uow.edu.my`
- `student3@student.uow.edu.my`

## Notable directories

```text
app/src/main/java/com/example/fyp1/api/           API services, DTOs, and repositories
app/src/main/java/com/example/fyp1/screens/       Compose screens
app/src/main/java/com/example/fyp1/components/    Shared UI components
app/src/main/java/com/example/fyp1/navigation/    App navigation
app/src/main/java/com/example/fyp1/offline/       Offline database, queue, and workers
app/src/main/java/com/example/fyp1/notifications/ Local reminders and notifications
app/src/main/res/                                 Android resources
admin-local/                                      Standalone local admin test page
```

## Local connectivity troubleshooting

- Confirm `http://localhost:5000/api/v1/health` works on the development computer first.
- Use `10.0.2.2`, not `localhost`, from the Android emulator.
- For a physical device, test the computer's LAN URL from the device browser and check Windows Firewall.
- Local HTTP access is governed by `app/src/main/res/xml/network_security_config.xml`; use HTTPS for deployed environments.
- Blob URLs returned by local Azurite may also need their host translated for the emulator/device.

See the repository [local integration guide](../docs/LOCAL_INTEGRATION_GUIDE.md) for the complete mobile smoke-test flow.


## Junior Developer Handover Note - Known Issues and Verification Items

Purpose
This note records the current known issues and handover risks for the Android Participation and Engagement mobile app. It is intended to help future junior developers understand what still needs to be checked or fixed.


Known Issues

1. Form data disappears after phone rotation
When the phone is rotated from portrait mode to landscape mode, the screen changes orientation and the information entered into the form may disappear. Form state needs to be preserved during configuration changes.

2. Some form input text may not be visible on certain phones
On some devices, text inside form input fields may be difficult or impossible to see because the font colour does not contrast properly with the background. This appears to depend on the phone or display/theme settings.

3. Cached values may be accessible by different users
Some values are stored locally on the phone. This can allow another user on the same device to access cached information, which should not happen. Local storage and user-session handling need to be reviewed.

4. Forget Password is unavailable
The Forget Password feature is currently unavailable. Users cannot reset their password through the app.

5. Leaderboard snapshot is not working
The leaderboard snapshot feature does not work because the required database table has not been created yet.

6. Notifications are local only
The notification feature currently uses local notifications. It does not support server-side or push notifications.

7. Quiz always treats the first option as correct
The quiz currently always shows or treats the first option as the correct answer. The answer-checking logic needs to be reviewed and fixed.



Recommended Next Steps

1. Fix state preservation for forms during phone rotation.
2. Review all form input colours and theme settings.
3. Audit local cache/session storage and clear sensitive data properly.
4. Add or connect the Forget Password flow.
5. Create the missing leaderboard snapshot database table.
6. Decide whether local notifications are enough or push notifications are required.
7. Fix quiz answer validation so the correct answer is based on the stored question data, not always the first option.

GoodLuck
