# Shaadi Wala

Shaadi Wala is an Indian wedding companion for a couple and their two families. This repo is the web app (Vite, React, TypeScript) and the Capacitor Android project. Accounts and wedding data live in Supabase. Each wedding is private to its members through Postgres row-level security.

The first release covers sign-up, a wedding, a Hindu ritual checklist, budget with family split and part-payments, guests and RSVP, and a timeline. Invite links, the onboarding wizard, analytics, in-app feedback, and in-app account deletion have seams in the code and are not finished yet.

## Requirements

- Node.js 22 or newer
- For a local database: Docker, then the [Supabase CLI](https://supabase.com/docs/guides/cli)
- For Android: JDK 21, Android SDK 36, and `ANDROID_HOME` pointing at the SDK

## Configuration

Copy the example env file and fill in the anon key when you have it. Do not commit `.env`.

```bash
cp .env.example .env
```

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Public anon key. Safe in the client because RLS restricts every wedding to its members. |
| `VITE_AUTH_REDIRECT_URL` | Optional. Web builds use the current origin plus `/auth`. Android builds use `in.shaadiwala.app://auth/callback`. |

The production project is already created:

- Project ref: `ujglzkfxgewqupkeqyek`
- URL: `https://ujglzkfxgewqupkeqyek.supabase.co`
- Region: ap-south-1 (Mumbai)
- Plan: Free

`.env.example` already uses that URL. Leave the anon key blank in git. Add the real key only as an environment variable (local `.env`, Vercel, or the shell that builds the Android app). Never put the service-role key in the client, in Vercel, or in this repo.

Vite inlines `VITE_*` values at build time. An Android build made without the anon key opens the “not configured” screen and can still preview the demo on the device.

## Database

Schema, RLS, the `create_wedding` function, and the `hindu-starter` ritual template are in `supabase/migrations/20261024180000_init.sql`.

Apply it to the hosted project in either of these ways:

1. Open the SQL editor in the [project dashboard](https://supabase.com/dashboard/project/ujglzkfxgewqupkeqyek) and run the migration file.
2. From this repo, with the Supabase CLI logged in:

```bash
npx supabase link --project-ref ujglzkfxgewqupkeqyek
npx supabase db push
```

For a local stack (Docker required):

```bash
npx supabase start
```

Local API URL is `http://127.0.0.1:54321`. Copy the local anon key from `npx supabase status` into `.env`. Local email confirmation is off, and mail is captured by Inbucket at `http://127.0.0.1:54324`. Point Android builds at the hosted HTTPS project. A device cannot use the cleartext local API.

Until the migration is applied, the app tells you the schema is missing instead of failing silently.

## Web app

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. With both env vars set you can create an account, create a wedding, and add tasks, budget items, guests, and timeline events. Reload the page and the data is still there.

Without the anon key, use **Preview the demo on this device**. That copy stays in `sessionStorage` for the tab and is cleared when you sign in for real.

```bash
npm test
npm run lint
npm run build
```

CI on GitHub runs those three commands on Node 22. It does not build the Android app and it does not need secrets.

## Google sign-in

1. In Google Cloud, create an OAuth client of type **Web application**.
2. Authorized redirect URI: `https://ujglzkfxgewqupkeqyek.supabase.co/auth/v1/callback`
3. In Supabase → Authentication → Providers → Google, paste that client id and secret.
4. In Supabase → Authentication → URL configuration, set the site URL to `https://shaadi-wala-2.vercel.app` and allow these redirects:
   - `https://shaadi-wala-2.vercel.app/auth`
   - `http://localhost:5173/auth`
   - `http://127.0.0.1:5173/auth`
   - `in.shaadiwala.app://auth/callback`

Email and password work without Google. On the Free plan, confirmation emails are rate-limited. For the first couples, either turn off “Confirm email” in Supabase Auth or configure custom SMTP.

## Vercel

The project stays a static SPA. `vercel.json` rewrites every path to `index.html`.

Set only these environment variables, then redeploy:

- `VITE_SUPABASE_URL` = `https://ujglzkfxgewqupkeqyek.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = the anon key

Do not set the service-role key.

## Android

The package id is `in.shaadiwala.app`. It is final. The web app, Capacitor, and Gradle all read it from `app.config.json`, together with the display name and the version:

```json
{
  "appId": "in.shaadiwala.app",
  "appName": "Shaadi Wala",
  "versionCode": 1,
  "versionName": "SW_1.0_Checklist-Budget-Guests-Timeline_2026-10-24"
}
```

`versionName` must match `SW_<version>_<Key-Features>_<YYYY-MM-DD>`. Features are hyphenated words with no spaces, for example `SW_1.0_Checklist-Budget-Guests_2026-11-17`. `versionCode` stays a positive integer. Raise it by 1 for every Play upload. Change both values only in `app.config.json`. The native package declaration in `MainActivity.java` matches the final id; changing the id later means regenerating `android/`.

After this project exists, sync with `npx cap sync android`. Do not run `npx cap add android` again. That command rewrites the manifest and string resources.

### Debug APK

```bash
export ANDROID_HOME="$HOME/Android/Sdk"   # this machine may use a different SDK path
npm run android:debug
```

The script builds the web app, syncs Capacitor, and runs `./gradlew assembleDebug`. The APK is `android/app/build/outputs/apk/debug/app-debug.apk`. Debug builds are signed with the Android debug keystore. APKs are gitignored.

Min SDK 24, compile and target SDK 36. Google sign-in on device returns through `in.shaadiwala.app://auth/callback`.

### Release bundle and Play signing

```bash
npm run keystore:upload
```

That runs `scripts/generate-keystore.sh`, which creates `android/shaadi-wala-upload.keystore` and `android/keystore.properties` on this machine. Both are gitignored. You can also copy `android/keystore.properties.example` and fill it in by hand. The passwords are prompted in the terminal and are not written to the command history by the script.

```bash
npm run android:release
```

That produces `android/app/build/outputs/bundle/release/app-release.aab` when the properties file is present. Upload the AAB to the Play Console internal testing track and enroll it in Play App Signing. Keep the upload keystore offline. The debug keystore is not a Play upload key.

## Product notes

The first-run wizard asks for your name, the couple, the wedding date, the city, your side, and which ceremonies to seed. The Hindu checklist has 53 rituals across Roka, Sagai, Haldi, Mehendi, Sangeet, Wedding, Vidaai, and Reception. The Tasks tab groups them by ceremony and can load any that are still missing. Renaming a ritual does not cause a duplicate.

Home totals count Indian rupees. Budget shows each family's share, what each family has paid, and who should settle with whom. Guests show RSVP counts and a headcount for the bride's side, the groom's side, and both, including plus-ones.

An owner or editor can invite a partner or family member with a 6-digit code or a link to `/invite/:code`. The role is editor or viewer. Viewers can read the wedding and cannot change it. Postgres row-level security enforces that.

Profile leads to Settings, and Settings leads to Delete account. Deletion asks you to type DELETE, then calls the `delete-account` edge function. The service-role key stays on Supabase. The same request can be made at https://shaadi-wala.in/delete-account/.

Sign-up and Settings link to the [Privacy Policy](https://shaadi-wala.in/privacy-policy/) and the [Terms of Service](https://shaadi-wala.in/terms-of-service/).

Feedback is text plus an optional 1–5 rating, stored in `feedback`. There is no screenshot upload.

Android targets SDK 36. The window is edge-to-edge: headers and the bottom navigation use `--safe-area-inset-top` and `--safe-area-inset-bottom`, which Capacitor fills on Android 15+ and which `env(safe-area-inset-*)` fills in the browser.

## Analytics

PostHog is optional. Set `VITE_POSTHOG_KEY` and, if you are not using the US cloud, `VITE_POSTHOG_HOST`. When the key is empty the app does not load PostHog and does not send events. This is the list to keep in the privacy policy:

| Event | When |
| --- | --- |
| `sign_up` | An email account is created |
| `wedding_created` | Onboarding creates a wedding |
| `onboarding_completed` | That same create finishes |
| `invite_sent` | An owner or editor creates an invite code |
| `invite_accepted` | Someone accepts a code |
| `first_task_added` | The first task lands on a wedding |
| `first_guest_added` | The first guest is saved |
| `first_budget_item_added` | The first budget item is saved |
| `app_open` | The app starts, once per page load |

Events are not autocaptured. The analytics host is a third-party processor and should stay named in the privacy policy next to Supabase.

## Dashboard checklist

Do these on project `ujglzkfxgewqupkeqyek` before the new app build is useful:

1. SQL Editor: run `supabase/migrations/20261024180000_init.sql` if it is not applied, then run `supabase/migrations/20261026120000_v1.sql`. Or `supabase link --project-ref ujglzkfxgewqupkeqyek` and `supabase db push`.
2. Edge Functions: deploy `delete-account` with `supabase functions deploy delete-account --project-ref ujglzkfxgewqupkeqyek`. Do not set a custom `SUPABASE_SERVICE_ROLE_KEY`; the platform injects it. Confirm the function has verify JWT on.
3. Auth → URL configuration: Site URL `https://shaadi-wala-2.vercel.app`. Add `https://shaadi-wala-2.vercel.app/auth`, `http://127.0.0.1:5173/auth`, `http://localhost:5173/auth`, and `in.shaadiwala.app://auth/callback`.
4. Auth → Google: enable the provider, paste the web client id and secret, and add `https://ujglzkfxgewqupkeqyek.supabase.co/auth/v1/callback` on the Google client.
5. Auth → SMTP, or leave email confirmations off, before the first real sign-up.
6. Local `.env`, Vercel, and the Android build shell: `VITE_SUPABASE_URL=https://ujglzkfxgewqupkeqyek.supabase.co` and `VITE_SUPABASE_ANON_KEY` from Project Settings → API keys. Never put the service role key in those places.
7. Optional: `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST` in the same three places. Leave them blank to send nothing.
8. Play upload key: `npm run keystore:upload`, then `npm run android:release`. Back up the keystore outside the repo.
