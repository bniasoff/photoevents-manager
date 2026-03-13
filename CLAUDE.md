# Photo Events Manager - Project Context

## Overview
A React Native (Expo) mobile app for managing photography event bookings with an Express.js backend and Supabase (PostgreSQL) database.

## Architecture

### Monorepo Structure
- `photoevents-app/` — React Native + Expo frontend (TypeScript)
- `photoevents-backend/` — Express.js backend (JavaScript), deployed on Vercel

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

## Running the Project
- Frontend: `cd photoevents-app && npx expo start`
- Backend: `cd photoevents-backend && node server.js` (port 3000)
- Backend env vars are in `photoevents-backend/.env`

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
