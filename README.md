# Clinic Scheduler

A production-oriented appointment management system for a small dental clinic:
receptionists book slots, doctors accept or request rescheduling, and admins
manage doctors, staff, and audit history. React + TypeScript + Tailwind on
the frontend, Firebase (Auth, Firestore, Cloud Functions) on the backend.

## What's implemented

- **Role-based access** for Admin / Receptionist / Doctor, enforced both in
  the frontend router (`ProtectedRoute`) and — the part that actually
  matters — in `firestore.rules`. The UI never decides who can do what; it
  only reflects what the rules already allow.
- **Atomic slot booking.** Double-booking is prevented with a
  deterministic-ID lock document (`slotLocks/{doctorId}_{date}_{startTime}`)
  written inside the same Firestore transaction as the appointment. Two
  receptionists racing for the same slot: one transaction commits, the
  other's `tx.get` sees the lock and throws before writing anything. See
  `src/services/appointmentService.ts`.
- **Full status machine** — `PENDING_DOCTOR_CONFIRMATION → CONFIRMED →
  COMPLETED`, the cancellation/reschedule branch, `EXPIRED`, `NO_SHOW` — with
  transitions validated against `VALID_TRANSITIONS` in `src/types/index.ts`
  before every write.
- **Doctor cancellation flow**: reason + next-available date/time required,
  visible to admin and receptionist, patient is never shown internal detail
  until the receptionist resolves it.
- **Temporary booking expiry**: a scheduled Cloud Function
  (`functions/src/index.ts`, every 5 minutes) is the authoritative sweep;
  the dashboards also call a lightweight client-side check on load so the
  UI doesn't wait 5 minutes to reflect an expiry.
- **Audit log** for every state change, written in the same transaction as
  the change it describes.
- **In-app notifications**, structured so an SMS/WhatsApp/email dispatcher
  could later trigger off the same `notifications` collection without
  changing the booking logic.
- **Dynamic slot generation** from a doctor's working hours + exceptions
  (leave/holiday/special) — slots are never pre-materialized, so changing a
  doctor's hours takes effect immediately.
- **Admin console**: doctors, receptionists, all users, appointments with
  search/filter + CSV export, basic reports, audit log viewer, settings
  (temporary-booking window, default consultation length).
- **Netlify + Firebase Hosting** configs, both with SPA rewrites so
  `/admin`, `/receptionist`, `/doctor` don't 404 on refresh.

### Intentionally kept lean

- **SMS/WhatsApp/email** are not wired up — the `notifications` collection
  and `NotificationChannel` type are shaped so a Cloud Function trigger can
  add a channel later without touching booking logic.
- **CSV export** is a client-side download, not a generated report file.
- **Reports** are counts and simple bar visualizations, not a charting
  library — enough to see today's load and doctor/specialization mix.
- Doctor "leave/holiday/special" exceptions are modeled in the schema and
  read by slot generation, but there's no dedicated admin screen to edit
  them yet — set them directly in the `doctors/{id}.exceptions` array (or
  add a small editor screen following the pattern in `DoctorsPage.tsx`).

## Project structure

```
src/
  firebase/        Firebase SDK init
  types/           Domain types + the appointment status machine
  context/         Auth + toast providers
  services/        All Firestore reads/writes (this is where the business
                    rules live — pages never call Firestore directly)
  components/      Shared UI: Sidebar/layout pieces, StatusBadge, Modal, etc.
  layouts/         DashboardLayout (desktop sidebar + mobile bottom nav)
  pages/
    admin/         Dashboard, doctors, receptionists, users, appointments,
                    reports, audit logs, settings
    receptionist/  Dashboard, booking flow, reschedule queue
    doctor/        Today's schedule, pending requests
functions/         Cloud Functions: createStaffUser, expireStaleBookings
scripts/seed.ts    Demo data seeder (Admin SDK)
firestore.rules    Server-enforced RBAC + business rules
```

## 1. Create the Firebase project

1. Go to the [Firebase Console](https://console.firebase.google.com) → **Add
   project**.
2. **Build → Authentication → Get started → Email/Password → Enable.**
3. **Build → Firestore Database → Create database** (start in production
   mode — the rules in this repo replace the defaults).
4. **Project settings → General → Your apps → Add app → Web**. Copy the
   config object; you'll need it for `.env`.
5. **Project settings → Service accounts → Generate new private key** (only
   needed for the seed script). Save as `serviceAccountKey.json` in the
   project root — it's already in `.gitignore`.

## 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in the six `VITE_FIREBASE_*` values from step 1.4. Leave
`VITE_DEFAULT_TEMP_BOOKING_MINUTES` at 15 unless you want a different
default (admins can also change it later from **Settings**, which takes
precedence once set).

## 3. Install dependencies

```bash
npm install
cd functions && npm install && cd ..
```

## 4. Deploy Firestore rules, indexes, and Cloud Functions

```bash
npm install -g firebase-tools   # if you don't have it
firebase login
firebase use --add              # pick the project you created
firebase deploy --only firestore:rules,firestore:indexes,functions
```

The first `expireStaleBookings` deploy may prompt you to enable the Cloud
Scheduler API and set a billing account (required for scheduled functions
even on light usage — the free tier covers this workload comfortably).

Firestore will also prompt you to create composite indexes the first time
each filtered query runs if `firestore.indexes.json` wasn't deployed — the
error message includes a direct console link if you'd rather create them
on demand instead.

## 5. Seed demo data

```bash
npm run seed
```

Creates one admin, two receptionists, three doctors (with logins), and
three specializations. Printed credentials use the password `Passw0rd!`
— change these before using the app with anyone outside your own testing.

## 6. Run locally

```bash
npm run dev
```

Log in with `admin@clinic.test` and seed the rest from there, or use the
seeded receptionist/doctor accounts directly.

## 7. Deploy to Netlify

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Netlify: **Add new site → Import an existing project**, pick the
   repo. Build command and publish directory are already set via
   `netlify.toml` (`npm run build` → `dist`).
3. **Site settings → Environment variables** → add the same six
   `VITE_FIREBASE_*` variables (and `VITE_DEFAULT_TEMP_BOOKING_MINUTES` if
   you changed it) from your `.env`.
4. Deploy. `netlify.toml` already redirects all paths to `index.html`, so
   direct navigation to `/admin`, `/receptionist`, `/doctor` won't 404.

(Firebase Hosting is configured too, via `firebase.json`, if you'd rather
deploy there instead: `npm run build && firebase deploy --only hosting`.)

## Manual test pass (matches section 34 of the original spec)

1. **Booking**: log in as a receptionist → New booking → pick
   specialization → doctor → date → an AVAILABLE slot → fill patient info →
   confirm. Status shows `PENDING_DOCTOR_CONFIRMATION`.
2. **Acceptance**: log in as that doctor → Requests → Accept. Status becomes
   `CONFIRMED`; the receptionist gets a notification.
3. **Doctor cancellation**: as the doctor, "Can't attend" on a confirmed
   appointment → reason + next available date/time → submit. Admin and
   receptionist both get notified; status is
   `DOCTOR_CANCELLATION_REQUESTED`.
4. **Reschedule or cancel**: as the receptionist, **Needs rescheduling** →
   pick a new slot (creates a new `PENDING_DOCTOR_CONFIRMATION` linked via
   `rescheduledFromId`) or cancel outright.
5. **Double-booking**: open the booking screen in two browser
   tabs/receptionist sessions, race for the same slot — only one succeeds;
   the other sees "That slot was just booked by someone else."
6. **RBAC**: try navigating a doctor account to `/admin` or `/receptionist`
   — redirected back to `/doctor`. Try it with Firestore rules directly
   (e.g. the Firebase console's rules playground) to confirm it's enforced
   server-side, not just hidden in the UI.
7. **Expiry**: create a booking, wait past the configured window (or lower
   it to 1 minute in Settings for testing) without the doctor responding —
   status flips to `EXPIRED` and the slot reopens, either within 5 minutes
   via the scheduled function or immediately on the receptionist dashboard's
   next load.
8. **Working-hours change**: edit a doctor's hours in **Admin → Doctors**,
   then reopen the booking screen for that doctor/date — the slot grid
   reflects the new hours immediately, since slots are generated at read
   time rather than stored.
