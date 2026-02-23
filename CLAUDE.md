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

## Frontend Structure

### 7 Bottom Tab Screens
1. **All Events** (`AllEventsScreen.tsx`) — searchable list with status filters
2. **By Date** (`ByDateScreen.tsx`) — grouped by week/month periods
3. **By Category** (`ByCategoryScreen.tsx`) — grouped by event type (Wedding, Bar Mitzvah, etc.)
4. **By Status** (`ByStatusScreen.tsx`) — Unpaid, Not Ready, Ready but Not Sent
5. **Calendar** (`CalendarScreen.tsx`) — monthly view with Hebrew holidays
6. **Reports** (`ReportsScreen.tsx`) — financial dashboard + CSV/PDF exports
7. **Settings** (`SettingsScreen.tsx`) — Google Calendar auth status, sort order, nav app preference

### Key Components
- `EventCard.tsx` — event list item display
- `EventDetailModal.tsx` — full editing modal with status toggles, financials, Google Calendar export
- `CreateEventModal.tsx` — new event creation form
- `CollapsibleSection.tsx` — expandable group headers
- `FilterChip.tsx` — status filter buttons
- `NotificationBanner.tsx` — notification permission UI

### Services (`src/services/`)
- `api.ts` — Supabase CRUD operations, field mapping (snake_case <-> PascalCase)
- `googleCalendarBackendService.ts` — OAuth flow + calendar event creation; `AuthStatus` includes `signedInAt`
- `exportService.ts` — CSV/PDF generation
- `notificationService.ts` — push notification scheduling
- `hebrewCalendarService.ts` — Hebrew holiday support
- `googleCalendarService.ts` — legacy calendar service
- `navigationPreference.ts` — AsyncStorage-backed user preferences: navigation app (Waze/Google Maps) and sort order (asc/desc); `openAddressInNavApp()` opens address in chosen app

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
Three sections:
1. **GOOGLE CALENDAR** — Shows sign-in date and exact re-sign deadline (signed_in_at + 7 days). Format: "Feb 28, 2026 at 3:45 PM". Also shows auth status (Connected/Not Connected), access token status, and sign out button.
2. **DISPLAY** — Sort order picker: "Oldest First" (asc) or "Newest First" (desc). Applies instantly to ALL list screens via `DeviceEventEmitter.emit('preferencesChanged')`.
3. **NAVIGATION** — Navigation app picker: "Waze" or "Google Maps". Used when tapping an address in EventDetailModal.

### Sort Order (Global)
- Preference stored in AsyncStorage via `navigationPreference.ts`
- All 5 screens (`AllEventsScreen`, `ByDateScreen`, `ByCategoryScreen`, `ByStatusScreen`, `CalendarScreen`) read sort preference on every `loadEvents` call
- `sortEventsByDate(events, order)` in `eventHelpers.ts` accepts `'asc' | 'desc'`
- `DeviceEventEmitter` pattern: when sort changes in Settings, all mounted screens reload instantly without tab switch
- **Important**: grouping helpers (`groupEventsByDate`, `groupEventsByStatus`, `groupEventsByYearAndCategory`) do NOT sort internally — they bucket events in the order received

### Navigation App Preference
- `openAddressInNavApp(address)` in `navigationPreference.ts` opens address in Waze or Google Maps
- Waze: deep link `waze://ul?q={address}`, fallback to web
- Google Maps: deep link `comgooglemaps://?q={address}`, fallback to `https://maps.google.com/?q={address}`
- EventDetailModal uses this instead of hardcoded Waze

### Sign-in Date Tracking
- Supabase `user_tokens` table has `signed_in_at TIMESTAMPTZ` column (added via SQL migration)
- Backend writes `signed_in_at` only when a new refresh token is received (fresh sign-in)
- `/auth/status` returns `signedInAt` field
- Settings shows: "Signed in: [date]" and "Re-sign required by: [date+7days]" with days remaining

### SQL Migration Required
```sql
ALTER TABLE user_tokens ADD COLUMN IF NOT EXISTS signed_in_at TIMESTAMPTZ;
```

### EAS Build
- Android APK built via `eas build --platform android --profile preview`
- Build profile in `eas.json` under `preview`
