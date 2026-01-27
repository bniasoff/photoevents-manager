# Photo Events Manager - Mobile App

A React Native mobile app for managing photography event bookings with a modern dark theme.

## 🚀 Getting Started

### Prerequisites
- Node.js (v22.9.0 or later)
- Expo Go app on your phone ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) | [iOS](https://apps.apple.com/app/expo-go/id982107779))

### Installation

The dependencies are already installed. If you need to reinstall:

```bash
cd photoevents-app
npm install
```

### Running the App

1. **Start the development server:**
   ```bash
   npm start
   ```

2. **Open on your device:**
   - **On Android/iOS Phone:** Open Expo Go app and scan the QR code
   - **On Android Emulator:** Press `a` in the terminal
   - **On Web Browser:** Press `w` in the terminal (limited mobile features)

### Testing on Your Windows PC

**Option 1: Web Browser (Quick Test)**
```bash
npm run web
```
- Opens in your default browser
- Limited to web features (no native mobile capabilities)

**Option 2: Expo Go on Mobile Device**
1. Install Expo Go on your phone
2. Run `npm start` in the photoevents-app folder
3. Scan the QR code with Expo Go (Android) or Camera app (iOS)

**Option 3: Android Emulator (Full Features)**
1. Install Android Studio
2. Set up an Android Virtual Device (AVD)
3. Run `npm run android`

## 📱 Features Implemented

### Phase 1 - MVP ✅
- [x] Dark theme with modern, sleek design
- [x] Event list with category icons (💒 Wedding, 🎉 Bar Mitzvah, etc.)
- [x] Real-time search by name, place, address, phone, category
- [x] Pull-to-refresh to reload events
- [x] Status badges (Paid/Unpaid, Ready/Not Ready, Sent/Not Sent)
- [x] Click-to-call phone numbers
- [x] Bottom tab navigation
- [x] Date-sorted event list

### Phase 2 - Grouping & Filtering ✅
- [x] Temporal grouping (This/Next Week, This/Next Month, Future, Last Week/Month)
- [x] Status-based grouping (Unpaid, Not Ready, Ready but Not Sent)
- [x] Collapsible group headers with event counts
- [x] Quick filter chips on All Events screen
- [x] Multi-criteria filtering (search + status filter combined)
- [x] Smooth expand/collapse animations

### Phase 3 - Editing & Actions ✅
- [x] Event detail modal (tap any event to view full details)
- [x] Status toggle switches (Paid, Ready, Sent)
- [x] Optimistic UI updates (instant feedback)
- [x] API integration for updates (saves to server)
- [x] Error handling with automatic revert
- [x] Click-to-call phone numbers (enhanced)
- [x] Click for directions (tap address to open maps)
- [x] Financial summary with balance calculation

### Phase 4 - Calendar & Notifications ✅
- [x] Full monthly calendar view with dark theme
- [x] Event markers on dates (blue dots)
- [x] Date selection and event filtering
- [x] "Jump to Today" button
- [x] Push notification system (expo-notifications)
- [x] Notification permission handling
- [x] Multiple notification types (upcoming, unpaid, ready-not-sent)
- [x] Notification banner for easy setup
- [x] Smart notification scheduling

### Phase 5 - Export & Reporting ✅
- [x] Payment summary dashboard with 8 key metrics
- [x] Export to CSV (all event data in spreadsheet format)
- [x] Export to PDF (formatted event list with details)
- [x] Payment summary PDF report (financial analytics)
- [x] Monthly summary PDF report (period-based breakdown)
- [x] Native share integration (email, save, messaging)
- [x] Timestamped filenames for organization
- [x] Professional PDF styling optimized for print

### Tabs
1. **📋 All Events** - Searchable list with quick filters & tap-to-edit (✅ WORKING)
2. **📅 By Date** - Collapsible groups by time periods & tap-to-edit (✅ WORKING)
3. **⚡ By Status** - Collapsible groups by status & tap-to-edit (✅ WORKING)
4. **📆 Calendar** - Interactive calendar view with event markers (✅ WORKING)
5. **📊 Reports** - Export & reporting with payment analytics (✅ WORKING)

## 🎨 Design

- **Dark Theme Colors:**
  - Background: #0A0E27
  - Cards: #1E293B
  - Primary: #3B82F6
  - Success: #10B981
  - Warning: #F59E0B
  - Error: #EF4444

- **Category Icons:**
  - 💒 Wedding
  - 🎉 Bar Mitzvah
  - 💍 Vort
  - 👶 Bris
  - 🍼 Pidyon Haben
  - 🏫 School
  - 📸 Photoshoot

## 🔧 Troubleshooting

### API Takes a While to Load
The API is hosted on Render's free tier, which goes to sleep when inactive. The first request may take 30-60 seconds to wake up the server. The app will show a loading spinner and retry button.

### Port Already in Use
If you see "Port 8081 is being used", either:
- Close other Expo/Metro processes
- Use a different port: `npx expo start --port 8082`

### Module Not Found Errors
Run: `npm install` to reinstall dependencies

### Clear Cache
If you encounter strange errors:
```bash
npx expo start -c
```

## 📂 Project Structure

```
photoevents-app/
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── EventCard.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorMessage.tsx
│   │   ├── CollapsibleSection.tsx
│   │   ├── FilterChip.tsx
│   │   ├── EventDetailModal.tsx
│   │   └── NotificationBanner.tsx     ✨ NEW (Phase 4)
│   ├── screens/         # Main app screens
│   │   ├── AllEventsScreen.tsx
│   │   ├── ByDateScreen.tsx
│   │   ├── ByStatusScreen.tsx
│   │   ├── CalendarScreen.tsx
│   │   └── ReportsScreen.tsx          ✨ NEW (Phase 5)
│   ├── navigation/      # Navigation setup
│   │   └── AppNavigator.tsx           ✨ UPDATED (Phase 5)
│   ├── services/        # API integration
│   │   ├── api.ts
│   │   ├── notificationService.ts
│   │   └── exportService.ts           ✨ NEW (Phase 5)
│   ├── theme/          # Design system
│   │   ├── colors.ts
│   │   └── theme.ts
│   ├── types/          # TypeScript interfaces
│   │   └── Event.ts
│   └── utils/          # Helper functions
│       ├── eventHelpers.ts
│       ├── dateHelpers.ts
│       └── statusHelpers.ts
├── App.tsx             # Main app entry point
├── app.json            # Expo config (notifications)
└── package.json        # Dependencies
```

## 📝 Notes

- API Endpoint: `https://photoevents-server.onrender.com/photoevents`
- The app works offline after initial load (events cached in state)
- Pull down to refresh events from server

## 🐛 Known Issues

- No offline persistence (events cached in memory only)
- Events can appear in multiple status groups (this is intentional)
- **API Updates**: If your API doesn't support PATCH `/photoevents/:id`, status toggles will show errors and auto-revert
- **Notifications in Expo Go**: Local notifications may not work fully in Expo Go - use development build for full testing
- **PDF Export on Web**: Limited functionality on web browser - use mobile device for best results

## 📞 Support

Created with Claude Code - see [PRD.md](../PRD.md) for full requirements and roadmap.
