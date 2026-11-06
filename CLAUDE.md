# Photo Events Manager - Project Context

## Overview
A React Native (Expo) mobile app for managing photography event bookings with an Express.js backend and Supabase (PostgreSQL) database.

## Architecture

### Monorepo Structure
- `photoevents-app/` — React Native + Expo frontend (TypeScript)
- `photoevents-backend/` — Express.js backend (JavaScript), deployed on Vercel
- `photoevents-web/` — React + Vite desktop web app (TypeScript), local-only (not deployed, not public) — see "Web App" section below

### Tech Stack
- **Frontend:** React Native, Expo SDK 54, TypeScript, React Navigation (bottom tabs)
- **Backend:** Express.js 5, Node.js, deployed on Vercel
- **Database:** Supabase (PostgreSQL) — two instances:
  - Frontend: `wkdjsvciamugtiidqafa.supabase.co`
  - Backend: `crtscrkgsedfwjvmhhlp.supabase.co`
- **Integrations:** Google Calendar API (OAuth2), expo-notifications, expo-print (PDF)

### Database Tables
- `events` — bookings (name, date, category, place, financials, status flags like Paid/Ready/Sent)
- `user_tokens` — Google OAuth tokens (access_token, refresh_token, expires_at, signed_in_at)
- `places` — legacy hand-curated venues (lakewood/brooklyn/crown_heights); kept as-is
- `places_directory` — master venue directory (318 venues, 9 regions); used by the app for place dropdowns
- `categories` — shared category list (name, sort_order) used by the category picker in both mobile and web; replaces the hardcoded category arrays that used to be duplicated per-screen. `sort_order` 1000 pins 'Other' last; new categories added from the app get the next free order below that. Created via `create-categories-table.sql` (run once in the Supabase SQL editor, frontend instance)
- `events`, `places_directory`, and `event_locations` each also have `street`/`city`/`state`/`zip` columns on top of the original single `address` string (added via `add-address-parts-columns.sql`). The address picker UI (web `PlacePicker`/`EventFormModal`, mobile `CreateEventModal`/`EventDetailModal`) collects these as 4 separate fields and computes `address` from them on save, so every existing consumer of the combined `address` string (nav apps, Google Calendar export, CSV/PDF) keeps working unchanged. Default city/state/zip for new entries is Lakewood, NJ 08701; `src/lib/eventHelpers.ts` (web) / `src/utils/eventHelpers.ts` (mobile) export `REGION_DEFAULTS` with sensible per-region defaults for the other 8 `places_directory` regions, and a `splitAddress()` helper that best-effort parses the old combined string when a row hasn't been backfilled yet. `backfill-address-parts.js` (run with `--dry-run` first, then `--write`) backfills the new columns for existing rows from their old `address` string.

### `places_directory` Regions
`'lakewood' | 'brooklyn' | 'crown_heights' | 'monsey' | 'five_towns' | 'queens' | 'passaic' | 'teaneck' | 'staten_island'`

## Frontend Structure

### 6 Bottom Tab Screens (Calendar is first/default)
1. **Calendar** (`CalendarScreen.tsx`) — monthly view with Hebrew holidays ← default tab
2. **All Events** (`AllEventsScreen.tsx`) — searchable list with status filters
3. **By Date** (`ByDateScreen.tsx`) — grouped by week/month periods
4. **By Category** (`ByCategoryScreen.tsx`) — grouped by event type; top sections: With Feedback, High Ratings, Recurring Customers, then years
5. **By Status** (`ByStatusScreen.tsx`) — Unpaid, Not Ready, Ready but Not Sent
6. **Reports** (`ReportsScreen.tsx`) — financial dashboard + CSV/PDF exports
7. **Settings** (`SettingsScreen.tsx`) — modal overlay opened via ⚙️ gear icon in header

### Key Components
- `EventCard.tsx` — event list item display
- `EventDetailModal.tsx` — full editing modal with status toggles, financials, Google Calendar export
- `CreateEventModal.tsx` — new event creation form
- `CollapsibleSection.tsx` — expandable group headers
- `FilterChip.tsx` — status filter buttons
- `NotificationBanner.tsx` — notification permission UI
- `EventActionMenu.tsx` — per-event action menu
- `ErrorMessage.tsx` — error state display
- `LoadingSpinner.tsx` — loading state display

### Theme & Config
- `src/theme/colors.ts`, `src/theme/theme.ts` — dark theme definitions used throughout (navigation, screens, components)
- `src/config/supabase.ts` — Supabase client singleton (frontend instance)

### Services (`src/services/`)
- `api.ts` — Supabase CRUD; `fetchPlaces(region)` queries `places_directory`; `savePlace(name, address, region)` upserts to `places_directory`
- `googleCalendarBackendService.ts` — OAuth flow + calendar event creation; `AuthStatus` includes `signedInAt`
- `exportService.ts` — CSV/PDF generation
- `notificationService.ts` — push notification scheduling; includes `schedulePreEventReminder(event, minutesBefore)`
- `hebrewCalendarService.ts` — Hebrew holiday support
- `googleCalendarService.ts` — legacy calendar service
- `navigationPreference.ts` — AsyncStorage-backed preferences: nav app, sort order, user location, reminder enabled/minutes

### `navigationPreference.ts` Exports
- `UserLocation` — `'lakewood' | 'brooklyn' | 'crown_heights' | 'monsey' | 'five_towns' | 'queens' | 'passaic' | 'teaneck' | 'staten_island'`
- `ReminderMinutes` — `10 | 30 | 60`
- `getUserLocationPreference()` / `setUserLocationPreference()`
- `getReminderEnabled()` / `setReminderEnabled()`
- `getReminderMinutes()` / `setReminderMinutes()`
- `getSortOrderPreference()` / `setSortOrderPreference()`
- `getNavAppPreference()` / `setNavAppPreference()`
- `openAddressInNavApp(address)` — opens in Waze or Google Maps

### Utils (`src/utils/`)
- Date helpers, status helpers, category helpers, event helpers
- `sortEventsByDate(events, order)` — accepts `'asc' | 'desc'` direction parameter
- Grouping helpers do NOT re-sort internally; they bucket events in the order received

### Types
- `Event.ts` — main Event interface with fields: Name, Place, Address, Phone, Category, EventDate, Start, End, Charge, Payment, Bal, Paid, Ready, Sent, Info, ToDo, SimchaInitiative, Projector, Weinman, Referral, etc.
- Multi-location support: `place2/address2/phone2`, `place3/address3/phone3` columns added via `add-location2-3-columns.sql`
- `EventCategory` — 26 recognized categories: Bar Mitzvah, Bat Mitzvah, Wedding, Vort, Bris, Pidyon Haben, School, Photoshoot, CM, Parlor Meeting, Siyum, L'Chaim, Chanukas Habayis, Melava Malka, Presentation, Shiur, Advertisements, Apsherin, Beis Medrash, Birthday, Even Hapina, Hachnosas Sefer Torah, Kollel, Seudas Hodah, Yorzeit, Other
- Category matching is case-insensitive; "Kolell" normalizes to "Kollel"

### iOS Expo Go Compatibility
- `notificationService.ios.ts` — stub file used automatically by Metro on iOS; prevents `expo-notifications` (which uses `PushNotificationIOS`) from loading in Expo Go where that native module doesn't exist
- `notificationService.ts` — real implementation used on Android / standalone builds

## Backend Endpoints (`server.js`)

### Auth
- `GET /auth/google?userId=<id>` — returns Google OAuth consent URL
- `GET /oauth2callback` — OAuth callback, stores tokens
- `GET /auth/status?userId=<id>` — check auth status
- `POST /auth/signout` — sign out, delete tokens

### Calendar
- `POST /calendar/create-event` — create Google Calendar event from booking

### Utility
- `GET /health` — health check
- `GET /debug/tokens` — debug token info

## Development Phases Completed
1. **Phase 1 (MVP):** Dark theme, event listing, search, real-time filtering, status badges
2. **Phase 2 (Grouping):** Temporal/status grouping, collapsible sections, multi-criteria filtering
3. **Phase 3 (Editing):** Event detail modal, inline editing, toggle switches, financial updates
4. **Phase 4 (Calendar):** Interactive calendar, push notifications, Hebrew holidays
5. **Phase 5 (Export):** CSV/PDF export, reporting dashboard, payment analytics
6. **Phase 6 (Auth):** Google Calendar OAuth, token refresh, re-auth flow
7. **Phase 7 (Settings & Preferences):** Sort order, nav app, location preference, sign-in tracking
8. **Phase 8 (Venues & Notifications):** Master venue directory, regional filtering, pre-event reminders

## Web App (`photoevents-web/`)
A desktop-focused React + Vite web app, built as a local-only companion to the mobile app — **not deployed anywhere, no public hosting, runs on localhost only** (Vite dev server bound to `localhost`, not `0.0.0.0`).
- **Stack:** React 19, TypeScript, Vite, Tailwind CSS v4 (`@tailwindcss/vite` plugin, no postcss config needed), `lucide-react` icons, `date-fns`.
- **Data:** Talks directly to the same frontend Supabase instance (`wkdjsvciamugtiidqafa.supabase.co`) as `photoevents-app` — same `events`/`places_directory` tables, same anon key, same RLS policies. No separate backend; `src/lib/api.ts` mirrors `photoevents-app/src/services/api.ts`'s Supabase calls (fetch/create/update/delete events, fetch/save/delete places).
- **Structure:** `src/lib/` (supabase client, api, event helpers, category/date grouping, reports/CSV, preferences, Google Calendar), `src/types/Event.ts` (mirrors mobile's type + category list/icons), `src/components/` (`Sidebar`, `CalendarView`, `AllEventsView`, `ByDateView`, `ByCategoryView`, `ByStatusView`, `ReportsView`, `SettingsView`, `EventFormModal`, `PlacePicker`, `EventRow`, `CollapsibleSection`, `StatusBadge`), `src/App.tsx` (shell + state).
- **All 7 views built:** Calendar, All Events, By Date (Last/This/Next Week, Previous/This/Next Month, Future), By Category (With Feedback / High Ratings / Recurring Customers / Year→Category, matching mobile exactly), By Status (Didn't Pay / Not Ready / Ready but Not Sent), Reports (financial summary cards, by-category breakdown, CSV export, Print/PDF via `window.print()` + a dedicated `.print-area`), Settings (sort order via `localStorage`, Google Calendar connect/status/disconnect).
- **`PlacePicker`** reuses the same "new place requires an address before it can be added" flow and the 🗑 delete-place button built for the mobile app's location pickers (see `photoevents-app` `EventDetailModal`/`CreateEventModal`).
- **Unpaid/Not Ready rules** (`src/lib/eventHelpers.ts` — `isUnpaid`, `isPastEvent`): matches mobile's `statusHelpers.ts`/`exportService.ts` exactly — unpaid excludes `Weinman` events and future-dated events; "Not Ready"/"Not Sent" filters on the All Events page are also past-events-only. "Ready but Not Sent" (By Status) has no date restriction, matching mobile.
- **Google Calendar integration** (`src/lib/googleCalendar.ts`) talks to the same **deployed** backend mobile uses (`https://photoevents-backend.vercel.app`), not the local one — the local backend's `.env` `GOOGLE_REDIRECT_URI` is configured for that deployed URL, not localhost. Same hardcoded `USER_ID = 'mobile-user'` as mobile, so the Google connection is shared between both apps (sign in on either, both see it connected). `EventFormModal` has an "Export to Google Calendar" button when editing an existing event.
- **Not yet built:** notifications-equivalent, multi-location (Place2/3) events.
- **TypeScript note:** `tsconfig.app.json` has `verbatimModuleSyntax: true` — type imports must use `import type { X }`, not mixed with value imports from the same module.
- Run: `cd photoevents-web && npm run dev` (http://localhost:5173)

## Running the Project
- Frontend (mobile): `cd photoevents-app && npx expo start`
- Web app: `cd photoevents-web && npm run dev`
- Backend: `cd photoevents-backend && node server.js` (port 3000)
- Backend env vars are in `photoevents-backend/.env`

## Operational Tooling (root-level scripts)
No root `package.json` — these are standalone Node scripts run manually with `node <script>.js`:
- `backup-supabase.js` (+ `run-backup.bat`) — scheduled weekly backup of `events`/`places`/`places_directory`/`user_tokens` to `backups/` as CSV+JSON
- `extract-sms-feedback.js` — pulls customer feedback/ratings text out of `XML/sms-*.xml` into `events.feedback`/`events.ratings`
- `export-sql-to-csv.*`, `export-to-csv.js`, `import-to-postgres.js`, `import-to-supabase.js` — migration/export utilities (MongoDB → Supabase lineage)
- `seed-places.js`, `seed-places-directory.js` — seed `places`/`places_directory` tables
- `check-feedback.js`, `test-hebrew-import.js` — ad-hoc debug scripts
- `photoevents-backend/check-and-reset-tokens.js` — CLI diagnostic to inspect/delete stored OAuth tokens
- `photoevents-backend/import-old-events.js` — one-off import of legacy CSV rows into Supabase

### Historical docs (superseded, kept for reference)
- `PRD.md` — original PRD describing an older architecture (Render-hosted API, MongoDB, React Context/Zustand, React Native Paper/NativeBase). Does **not** reflect the current implementation — superseded by the Supabase migration.
- `SUPABASE_MIGRATION_GUIDE.md` — MongoDB → Supabase migration walkthrough
- `PHASE2_COMPLETE.md` … `PHASE5_COMPLETE.md` — dated write-ups for phases 2–5; phases 6–8 are documented only inline in this file

## Key Decisions & Notes
- User ID is hardcoded as `mobile-user` (no user auth in app)
- Dark theme throughout the app
- American date format (MM/DD/YYYY)
- Category icons: Wedding, Bar Mitzvah, Vort, Bris, etc.
- Google Calendar uses a specific Photography Event calendar ID
- No formal test suite — manual testing via Expo Go / web browser

## Recent Fixes (Google Calendar Auth - Feb 2026)
- **Fixed `expires_at` bug** in server.js: was `Date.now() + tokens.expiry_date` (double timestamp), now correctly stores `tokens.expiry_date` directly
- **Fixed token refresh flow**: backend now proactively refreshes expired tokens and retries on 401 before deleting tokens
- **Fixed frontend re-auth loop**: frontend only opens browser for sign-in when backend confirms refresh token is gone (`needsReauth: true`), not on every 401
- **Goal**: Sign in to Google once, backend auto-refreshes access tokens using stored refresh token indefinitely

## Phase 7 Features (Feb 2026)

### Settings Screen (`SettingsScreen.tsx`)
Five sections:
1. **GOOGLE CALENDAR** — Shows sign-in date and exact re-sign deadline (signed_in_at + 7 days). Format: "Feb 28, 2026 at 3:45 PM". Also shows auth status (Connected/Not Connected), access token status, and sign out button.
2. **DISPLAY** — Sort order picker: Oldest First / Newest First / Name A→Z / Name Z→A.
3. **MY LOCATION** — Filters the place dropdown by region: Lakewood Area, Brooklyn, Crown Heights, Monsey, Five Towns, Queens, Passaic, Teaneck, Staten Island.
4. **NOTIFICATIONS** — Toggle event reminders ON/OFF; time picker: 10 min / 30 min / 1 hour before event.
5. **NAVIGATION** — Navigation app picker: "Waze" or "Google Maps".

### Sort Order (Global)
- Preference stored in AsyncStorage via `navigationPreference.ts`
- All 5 screens read sort preference on every `loadEvents` call
- `DeviceEventEmitter.emit('preferencesChanged')` — all mounted screens reload instantly

### My Location / Venue Filtering
- `UserLocation` type covers 9 regions; stored in AsyncStorage
- Modals call `getUserLocationPreference()` on open, pass region to `fetchPlaces(region)`
- Lakewood: merges `places_directory` (lakewood) + full `events` history
- Other regions: only `places_directory` filtered by region (strict, no cross-region bleed)
- Custom places added by user are saved to `places_directory` with the current region
- `setDbPlaces(map)` always called (even for empty result) so `null` = loading, `{}` = no venues found

### Pre-Event Notifications
- `schedulePreEventReminder(event, minutesBefore)` in `notificationService.ts`
- Called automatically after create (CreateEventModal) and after save (EventDetailModal)
- Checks `getReminderEnabled()` + `getReminderMinutes()` before scheduling
- Only schedules if event is in the future and notification time is also in the future
- Notification: "📸 Upcoming Event: [Name]" — "[Category] at [Place] starts in X minutes/hour"

### Venue Directory
- `places_directory` table: 318 venues across 9 regions (compiled from 46 PDF files)
- Seed script: `seed-places-directory.js` — merges CSV + existing `places` table, upserts to `places_directory`
- SQL DDL: `create-places-directory.sql`
- Source PDFs: `Venues/` folder; master CSV: `Venues/master-venues.csv`
- Venues per region: brooklyn(121), lakewood(78), crown_heights(34), monsey(26), five_towns(21), passaic(12), teaneck(12), queens(11), staten_island(3)

### Sign-in Date Tracking
- Supabase `user_tokens` table has `signed_in_at TIMESTAMPTZ` column
- Backend writes `signed_in_at` only when a new refresh token is received
- Settings shows: "Signed in: [date]" and "Re-sign required by: [date+7days]" with days remaining

### SQL Migrations Required
```sql
ALTER TABLE user_tokens ADD COLUMN IF NOT EXISTS signed_in_at TIMESTAMPTZ;
-- Run create-places-directory.sql to create places_directory table
-- Run: node seed-places-directory.js to populate it
```

### EAS Build
- Android APK built via `eas build --platform android --profile preview`
- Build profile in `eas.json` under `preview`

## By Category Screen Layout
1. 💬 With Feedback (grouped by category, 2023+)
2. ⭐ High Ratings (grouped by category, 2023+, rating > 3)
3. ↻ Recurring Customers (grouped by category)
4. 📅 Year sections (most recent first, each year → categories)
