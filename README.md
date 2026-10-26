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
| `VITE_SUPABASE_ANON_KEY` | Public anon key, or the new publishable key. Safe in the client because RLS restricts every wedding to its members. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Optional. Used when the anon key is blank. `.env.example` includes the public publishable key. |
| `VITE_AUTH_REDIRECT_URL` | Optional. Web builds use the current origin plus `/auth`. Android builds use `in.shaadiwala.app://auth/callback`. |

The production project is already created:

- Project ref: `ujglzkfxgewqupkeqyek`
- URL: `https://ujglzkfxgewqupkeqyek.supabase.co`
- Region: ap-south-1 (Mumbai)
- Plan: Free

`.env.example` already uses that URL and the public publishable key. Set `VITE_SUPABASE_ANON_KEY` to the same publishable key, or leave it blank and set `VITE_SUPABASE_PUBLISHABLE_KEY`. Never put a secret or service-role key in the client, in Vercel, or in this repo.

Vite inlines `VITE_*` values at build time. An Android build made without the anon key opens the “not configured” screen and can still preview the demo on the device.

## Database

Schema, RLS, the `create_wedding` function, and the `hindu-starter` ritual template are in these files. Run them in this order, in the SQL editor:

1. `supabase/migrations/20261024180000_init.sql`
2. `supabase/migrations/20261026120000_v1.sql`
3. `supabase/migrations/20261026150000_roles.sql`
4. `supabase/migrations/20261026180000_permissions.sql`
5. `supabase/migrations/20261026190000_feedback_screenshot.sql`
6. `supabase/migrations/20261026200000_checklist_templates.sql`

`init.sql`, `v1.sql`, `roles.sql`, `feedback_screenshot.sql`, and `checklist_templates.sql` can be run again. Run `permissions.sql` after `roles.sql`, and run it again if you apply `roles.sql` or `v1.sql` after it. Then run `feedback_screenshot.sql`, then `checklist_templates.sql`. If you apply `permissions.sql` after the checklist file, run `checklist_templates.sql` again so a friend still cannot change a ritual's position or function. `permissions.sql` is the permissions table: change `role_permissions` to change who can do what. The seeded rows are the matrix approved on 26 Oct. `roles.sql` is the bride, groom, family, friend, and planner shape. A partial unique index keeps one bride and one groom, including when two people join at the same time. `feedback_screenshot.sql` adds an optional private screenshot bucket. `checklist_templates.sql` stores the Hindu checklist as community `hindu` version 1 and copies it onto each new wedding.

Apply them on the hosted project in either of these ways:

1. Open the SQL editor in the [project dashboard](https://supabase.com/dashboard/project/ujglzkfxgewqupkeqyek) and run those files, in that order.
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
  "versionCode": 3,
  "versionName": "SW_0.1_FoundationOAuthMixpanel_03Nov26"
}
```

`versionName` must match `SW_<version>_<Key-Features>_<YYYY-MM-DD>` or `SW_<version>_<Key-Features>_<DDMonYY>`. Features are hyphenated words with no spaces. This slice ships as `SW_0.1_FoundationOAuthMixpanel_03Nov26`. `versionCode` stays a positive integer. Raise it by 1 for every Play upload. Change both values only in `app.config.json`. The native package declaration in `MainActivity.java` matches the final id; changing the id later means regenerating `android/`.

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

Creating a wedding copies the Hindu checklist onto that wedding. The template is stored as community `hindu`, version 1, so another community can be added later. v1 has no religion or caste ceremony picker. The Tasks screen shows the community as text. The couple and the planner can add, rename, reorder, and remove functions and rituals on their own wedding. Family can still edit rituals on their own side. Friends can complete rituals assigned to them and cannot change position or function. The Hindu list has 53 rituals across Roka, Sagai, Haldi, Mehendi, Sangeet, Wedding, Vidaai, and Reception.

Home and the Budget “All” filter total Indian rupees only, in lakh and crore on Home. A dollar amount stays in dollars and is not added into the rupee total. A line item cannot be negative or more than ₹10 crore. Budget shows each family's share, what each family has paid, and who should settle with whom. Guests show total, confirmed, pending, and declined counts. Headcount split by side is parked with the rest of RSVP-by-side.

The couple creates the wedding as the bride or the groom. They invite other people with a 6-digit code or a link to `/invite/:code`. The person joining picks a role and, for a parent or friend, a side. A parent can invite family and friends to their own side. Friends and planners cannot invite. A link that is not six digits shows an invalid-code state. Postgres row-level security reads `role_permissions` through `has_permission`. The planner has no side, friends have no budget access, and only the bride or groom can change a member's side. The sample wedding date is 180 days after the day the demo is opened. A date that has already passed says the wedding day has passed.

The old first-run wizard and the RSVP-by-side guest panel stay in the repo, behind `legacyOnboardingEnabled` and `rsvpBySideEnabled` in `src/features/onboarding/flag.ts`. Both are `false`, so neither is in the production bundle. Flip a constant to compile that slice back in. The default screen is the bride-or-groom create flow.

Profile leads to Settings, and Settings leads to Delete account. Deletion asks you to type the exact word DELETE, then calls the `delete-account` edge function. The secret key stays on Supabase. The same request can be made at https://shaadi-wala.in/delete-account/.

Sign-up and Settings link to the [Privacy Policy](https://shaadi-wala.in/privacy-policy/) and the [Terms of Service](https://shaadi-wala.in/terms-of-service/).

Feedback is text plus an optional 1–5 rating, stored in `feedback`. A screenshot is optional. It is stored in the private `feedback-screenshots` bucket, and storage policies allow only the person who uploaded it to read or delete it.

Android targets SDK 36. The window is edge-to-edge: headers and the bottom navigation use `--safe-area-inset-top` and `--safe-area-inset-bottom`, which Capacitor fills on Android 15+ and which `env(safe-area-inset-*)` fills in the browser.

## Analytics

The app calls a small analytics interface. The installed provider is a no-op, so nothing is sent. PostHog code is parked in `src/lib/analytics/posthog.ts` and is not imported. Mixpanel can implement the same interface when that account is approved. These are the event names to keep for that provider:

| Event | When |
| --- | --- |
| `sign_up` | An email account is created |
| `wedding_created` | Onboarding creates a wedding |
| `onboarding_completed` | That same create finishes |
| `invite_sent` | The bride, groom, or a parent creates an invite code |
| `invite_accepted` | Someone accepts a code |
| `first_task_added` | The first task lands on a wedding |
| `first_guest_added` | The first guest is saved |
| `first_budget_item_added` | The first budget item is saved |
| `app_open` | The app starts, once per page load |

Events are not autocaptured. The analytics host is a third-party processor and should stay named in the privacy policy next to Supabase.

## Dashboard checklist

Do these on project `ujglzkfxgewqupkeqyek` before the new app build is useful:

1. SQL Editor, in this order: `supabase/migrations/20261024180000_init.sql`, then `supabase/migrations/20261026120000_v1.sql`, then `supabase/migrations/20261026150000_roles.sql`, then `supabase/migrations/20261026180000_permissions.sql`, then `supabase/migrations/20261026190000_feedback_screenshot.sql`, then `supabase/migrations/20261026200000_checklist_templates.sql`. Run `permissions.sql` again whenever an earlier file is applied after it, then run the screenshot file, then run the checklist file again. Or `supabase link --project-ref ujglzkfxgewqupkeqyek` and `supabase db push`. These files have not been applied to the hosted project from this repo.
2. Edge Functions: redeploy `delete-account` with `supabase functions deploy delete-account --project-ref ujglzkfxgewqupkeqyek`. The function reads the publishable key and the secret key (`SUPABASE_PUBLISHABLE_KEYS` / `SUPABASE_SECRET_KEYS`, or the legacy anon and service-role names). Leave `verify_jwt` off in `supabase/config.toml`; the function checks the user JWT itself, because new `sb_` keys are not JWTs. Do not put the secret key in the app.
3. Auth → URL configuration: Site URL `https://shaadi-wala-2.vercel.app`. Add `https://shaadi-wala-2.vercel.app/auth`, `http://127.0.0.1:5173/auth`, `http://localhost:5173/auth`, and `in.shaadiwala.app://auth/callback`.
4. Auth → Google: enable the provider, paste the web client id and secret, and add `https://ujglzkfxgewqupkeqyek.supabase.co/auth/v1/callback` on the Google client.
5. Auth → SMTP, or leave email confirmations off, before the first real sign-up.
6. Local `.env`, Vercel, and the Android build shell: `VITE_SUPABASE_URL=https://ujglzkfxgewqupkeqyek.supabase.co` and either `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY` set to the public publishable key. Never put the secret key in those places.
7. Optional: `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST` in the same three places. Leave them blank to send nothing.
8. Play upload key: `npm run keystore:upload`, then `npm run android:release`. Back up the keystore outside the repo.
