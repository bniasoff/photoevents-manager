# Product Requirements Document: Photo Events Management App

## 1. Overview

### 1.1 Product Name
Photo Events Manager (Mobile)

### 1.2 Product Description
A cross-platform mobile application for managing photography event bookings, featuring advanced search, filtering, and grouping capabilities with a modern dark theme interface.

### 1.3 Target Platforms
- Android devices
- iOS devices
- Development testing on Windows PC

### 1.4 Technology Stack
- **Framework**: React Native (for cross-platform mobile development)
- **Development Tool**: Expo (for easy testing and deployment)
- **API Endpoint**: `https://photoevents-server.onrender.com/photoevents`
- **State Management**: React Context or Zustand (lightweight)
- **UI Library**: React Native Paper or NativeBase (dark theme support)
- **Navigation**: React Navigation with bottom tabs

### 1.5 Key Decisions Made
- ✅ **Full editing capabilities**: Users can update payment, readiness, and send status
- ✅ **No authentication**: Open access (can add later if needed)
- ✅ **Image support**: Event thumbnails displayed in list view
- ✅ **API sync**: Status updates saved back to server
- ✅ **Bottom tab navigation**: Quick access to different views
- ✅ **Additional features**: Click-to-call, calendar view, notifications, export/reporting

---

## 2. Core Features

### 2.1 Event Listing
**Priority**: P0 (Must Have)

#### Requirements:
- Display all events from the API endpoint
- Default sort order: Event date (ascending)
- Modern, sleek, dark theme design
- Smooth scrolling experience
- Pull-to-refresh functionality

#### Data Fields (From API):
**Core Fields:**
- `_id` - MongoDB ObjectId (unique identifier)
- `Name` - Client/Event name (string)
- `EventDate` - Event date (ISO 8601 timestamp)
- `Start` - Start time (HH:MM:SS)
- `End` - End time (HH:MM:SS)
- `Category` - Event type (Bar Mitzvah, Vort, Bris, Wedding, School, Photoshoot, Pidyon Haben, etc.)

**Venue & Contact:**
- `Place` - Venue name (string)
- `Address` - Full venue address (string)
- `Phone` - Contact phone number (string)

**Financial:**
- `Charge` - Quoted price (string/number)
- `Payment` - Amount paid (string/number)
- `Bal` - Balance (typically empty)
- `Paid` - Payment status ("True"/"true"/empty/false)

**Workflow Status:**
- `Ready` - Ready status ("True"/"true"/empty)
- `Sent` - Delivery status ("True"/"true"/empty)

**Additional:**
- `Info` - Additional information/notes (string)
- `ToDo` - Todo notes (typically empty)
- `Referral` - Referral source (null/string)
- `CreatedDate`, `createdAt`, `updatedAt` - Timestamps
- `EtagID` - Version identifier

**Note:** No image/photo URL fields in current API

---

### 2.2 Search Functionality
**Priority**: P0 (Must Have)

#### Search Capabilities:
- Search by Name (client/event name)
- Search by Place (venue name)
- Search by Address (venue address)
- Search by Phone Number
- Search by Category (event type)
- Real-time search (search as you type)
- Clear search button
- Search history (optional enhancement)

#### UX Requirements:
- Persistent search bar at top of screen
- Highlight matching results
- Display "No results found" state
- Search should work across all groups/filters

---

### 2.3 Temporal Grouping
**Priority**: P0 (Must Have)

#### Weekly Groups:
- **Last Week**: Events from 7 days ago to start of current week
- **This Week**: Events in current calendar week
- **Next Week**: Events in upcoming calendar week

#### Monthly Groups:
- **Last Month**: Events from previous calendar month
- **This Month**: Events in current calendar month
- **Next Month**: Events in upcoming calendar month

#### Additional Groups:
- **Future Events**: All events beyond next month

#### UX Requirements:
- Collapsible/expandable group headers
- Event count badge on each group
- Smooth animations for expand/collapse
- Ability to view all groups simultaneously or filter to one group

---

### 2.4 Status-Based Grouping
**Priority**: P0 (Must Have)

#### Status Categories:
1. **Didn't Pay**: Events where payment is pending/not received
2. **Not Ready**: Events not yet ready for delivery
3. **Ready but Not Sent**: Events ready but not yet delivered to client

#### UX Requirements:
- Visual status indicators (icons/badges)
- Color-coded status (within dark theme palette)
- Quick filter buttons for each status
- Ability to combine status filters with temporal groups

---

### 2.5 UI/UX Design
**Priority**: P0 (Must Have)

#### Design System:
- **Theme**: Dark mode (primary)
- **Style**: Modern, sleek, minimal
- **Typography**: Clean, readable fonts
- **Spacing**: Generous padding/margins for mobile touch
- **Animations**: Smooth transitions and micro-interactions

#### Dark Theme Palette (Suggested):
- Background: #0A0E27 / #151B2E
- Card Background: #1E293B / #242F42
- Primary Accent: #3B82F6 / #60A5FA
- Success: #10B981
- Warning: #F59E0B
- Error: #EF4444
- Text Primary: #F1F5F9
- Text Secondary: #94A3B8

#### List Item Design:
- Card-based layout
- Subtle shadows/elevation
- Clear visual hierarchy
- Status badges prominently displayed
- Swipe gestures for actions (optional)

---

## 3. Technical Requirements

### 3.1 API Integration
- RESTful API consumption
- Error handling for network failures
- Loading states
- Retry mechanism for failed requests
- Offline support (optional - Phase 2)

### 3.2 Performance
- List virtualization for large datasets
- Lazy loading of images (if applicable)
- Optimized re-renders
- Smooth 60fps scrolling

### 3.3 Development & Testing
- Expo Go for quick testing on Windows PC
- Hot reload for rapid development
- Testing on both Android and iOS simulators
- Responsive design for various screen sizes

---

## 4. User Stories

### 4.1 Event Discovery
- As a photographer, I want to see all my upcoming events ordered by date so I can plan my schedule
- As a photographer, I want to quickly find events by searching for a client's name, phone, or location

### 4.2 Status Management
- As a photographer, I want to see which clients haven't paid so I can follow up
- As a photographer, I want to see which events are ready but not sent so I can deliver them
- As a photographer, I want to see which events aren't ready so I know what work is pending

### 4.3 Time-Based Organization
- As a photographer, I want to see this week's events separately from next week's events
- As a photographer, I want to review last month's events
- As a photographer, I want to see all future events beyond the current month

---

## 5. Confirmed Requirements & Remaining Questions

### 5.1 ✅ CONFIRMED
- Full editing capabilities for event statuses
- No authentication required
- Event thumbnails in list view
- API sync for updates (need PUT/PATCH endpoints)
- Bottom tab navigation
- Click-to-call functionality
- Calendar view option
- Push notifications/reminders
- Export/reporting features

### 5.2 ✅ CONFIRMED - Data Structure
- **Unique Identifier**: `_id` (MongoDB ObjectId) or `ID` field
- **All Fields**: See Section 2.1 for complete field list
- **Images**: ⚠️ No image URL fields in current API - Need to decide approach
- **Data Type Issues**: `Paid`, `Ready`, `Sent` use inconsistent values ("True"/"true"/empty)
- **Financial Fields**: `Charge` and `Payment` stored as strings (need parsing)

### 5.3 ❓ PENDING - API Capabilities
- Does the API support PUT/PATCH for updates?
- What fields can be updated via API?
- Are there separate endpoints for different operations?
- Rate limiting or throttling?
- CORS configuration for mobile access?

### 5.4 ✅ CONFIRMED - Business Logic (Status Determination)
- **Didn't Pay**: `Paid` field is empty, false, or not "True"/"true"
- **Not Ready**: `Ready` field is empty or not "True"/"true"
- **Ready but Not Sent**: `Ready` is "True"/"true" AND `Sent` is empty or not "True"/"true"
- Events can be in multiple states (e.g., Paid but Not Ready)
- Event categories include: Bar Mitzvah, Vort, Bris, Wedding, School, Photoshoot, Pidyon Haben

### 5.4.1 ❓ PENDING - Image Strategy
Since API has no image fields, choose approach:
1. **Category-based icons**: Display icon based on event Category (Bar Mitzvah, Wedding, etc.)
2. **No images for now**: Text-only list, add image support later
3. **Add image field to API**: Modify backend to support image URLs (requires backend access)

### 5.5 ❓ PENDING - Notifications
- What triggers should send notifications? (Event in 24hrs, unpaid for 7 days, etc.)
- How far in advance for event reminders?
- Should notifications be configurable?

### 5.6 ❓ PENDING - Export/Reporting
- What format for exports? (CSV, PDF, Excel?)
- What reports are most useful? (Monthly revenue, unpaid summary, etc.)
- Should reports be shareable?

---

## 6. Success Metrics

- Fast load time (< 2 seconds)
- Smooth scrolling performance (60fps)
- Quick search results (< 500ms)
- Easy navigation (max 2 taps to any feature)
- Works reliably on both Android and iOS

---

## 7. Development Phases

### Phase 1: Core Functionality (MVP)
**Goal**: Working app with essential features
- ✅ Expo React Native setup
- ✅ Dark theme implementation
- ✅ API integration and data fetching
- ✅ Event list with thumbnails
- ✅ Bottom tab navigation (All Events, By Date, By Status, Calendar)
- ✅ Basic search functionality
- ✅ Date sorting and display

### Phase 2: Grouping & Filtering
**Goal**: Advanced organization features
- ✅ Temporal grouping (this/last/next week & month, future)
- ✅ Status-based grouping (didn't pay, not ready, ready but not sent)
- ✅ Collapsible group headers
- ✅ Multi-criteria filtering
- ✅ Search across all fields (Name, Place, Address, Phone, Category)

### Phase 3: Editing & Actions
**Goal**: Make app interactive
- ✅ Event detail view (tap to expand)
- ✅ Status update functionality (payment, readiness, sent)
- ✅ API integration for updates (PUT/PATCH)
- ✅ Click-to-call phone numbers
- ✅ Optimistic UI updates
- ✅ Error handling and retry logic

### Phase 4: Calendar & Notifications
**Goal**: Enhanced user experience
- ✅ Calendar view implementation
- ✅ Push notification setup
- ✅ Notification triggers (upcoming events, unpaid reminders)
- ✅ Notification permissions
- ✅ Calendar date navigation

### Phase 5: Export & Reporting
**Goal**: Business intelligence features
- ✅ Export to CSV/PDF
- ✅ Export to ICS (calendar file format)
- ✅ Google Calendar export with OAuth authentication
- ✅ Payment summary reports
- ✅ Monthly/weekly summaries
- ✅ Share functionality

### Phase 6: User Experience Enhancements
**Goal**: Improved UX and productivity features
- ✅ **Copy Reference Button**: Quick copy event name and phone for texting references
- ✅ **Toast Notifications**: Green auto-dismissing success notifications (3 seconds)
  - Copy reference: "✓ Copied to clipboard!"
  - Export: "✓ Exported"
  - Save: "✓ Saved"
  - Create event: "✓ Created & Exported" / "✓ Created"
- ✅ **Google Calendar Auto-Refresh**: Automatic token refresh when authentication expires
  - Polling mechanism to wait for OAuth completion
  - Seamless retry after re-authentication
  - No manual "try again" clicking needed
- ✅ **Non-blocking UI**: Toast notifications instead of Alert.alert for success messages

### Phase 7: Settings & User Preferences
**Goal**: Personalization and improved navigation UX
- ✅ **Settings Screen**: New dedicated tab with three sections (Google Calendar, Display, Navigation)
- ✅ **Sort Order Preference**: Global ascending/descending sort applied to ALL list screens
  - Stored in AsyncStorage, persists across app restarts
  - "Oldest First" (ascending) or "Newest First" (descending)
  - Changes apply instantly to all mounted screens via DeviceEventEmitter broadcast
- ✅ **Navigation App Preference**: Choose Waze or Google Maps for address links
  - Deep link to native app with web fallback
  - Used in Event Detail Modal when tapping an address
- ✅ **Google Sign-in Tracking**: Shows exact sign-in date and re-authentication deadline
  - `signed_in_at` column in Supabase `user_tokens` table
  - Displays "Re-sign required by [date/time]" with days remaining countdown
  - Only updated when a brand-new refresh token is received

### Future Enhancements (Post-Launch)
- Offline mode with local caching
- Multi-user support with authentication
- Photo gallery with full-screen viewer
- Notes/comments on events
- Email client directly from app
- Revenue analytics dashboard
- SMS feedback import from XML backups
- Client ratings and feedback tracking
- Publish Google Cloud project (Testing → Production) for indefinite refresh tokens

---

## 8. Recommended App Structure

### Bottom Tab Navigation
1. **📋 All Events Tab**
   - Chronological list of all events
   - Search bar at top
   - Quick status filter chips
   - Pull to refresh

2. **📅 By Date Tab**
   - Collapsible groups:
     - Last Week
     - This Week
     - Next Week
     - Last Month
     - This Month
     - Next Month
     - Future Events
   - Event count badges
   - Smooth expand/collapse animations

3. **⚡ By Status Tab**
   - Three main sections:
     - 💰 Didn't Pay (unpaid events)
     - ⏳ Not Ready (pending work)
     - ✅ Ready but Not Sent (completed, awaiting delivery)
   - Visual status indicators
   - Quick action buttons

4. **📆 Calendar Tab**
   - Month/week view
   - Event dots/markers on dates
   - Tap date to see events
   - Today button
   - Navigate months

5. **⚙️ Settings Tab**
   - **GOOGLE CALENDAR section**: Auth status, access token status, sign-in date, re-sign deadline, sign out
   - **DISPLAY section**: Sort order (Oldest First / Newest First) — applies to all screens globally
   - **NAVIGATION section**: Default map app (Waze / Google Maps) for address links

### Event Card Design (Dark Theme)
```
┌─────────────────────────────────────────┐
│ [Icon]  Anderson                      ⚡│
│   💒    Bar Mitzvah                   📍│
│         Gissinger Hall                  │
│         175 Sunset Rd, Lakewood, NJ     │
│         📞 (718) 483-4098               │
│         📅 Feb 2, 2026 @ 5:30 PM        │
│         💰 PAID ✅ | READY ✅ | SENT ✅│
└─────────────────────────────────────────┘
```

**Status Badge Colors (Dark Theme):**
- 💰 **PAID** (Green #10B981) / **UNPAID** (Red #EF4444)
- ⏳ **READY** (Blue #3B82F6) / **NOT READY** (Orange #F59E0B)
- 📤 **SENT** (Purple #8B5CF6) / **NOT SENT** (Gray #6B7280)

**Category Icons:**
- 💒 Wedding
- 🎉 Bar Mitzvah
- 💍 Vort
- 👶 Bris
- 🍼 Pidyon Haben
- 🏫 School
- 📸 Photoshoot
- 📅 Other

---

## 9. API Documentation

### 9.1 Base URL
```
https://photoevents-server.onrender.com
```

### 9.2 GET All Events
**Endpoint:** `/photoevents`
**Method:** GET
**Response:** Array of event objects

### 9.3 Example API Response
```json
[
  {
    "_id": "675bdbc48d01a3c3fdc7a9e3",
    "ID": "unique-id-string",
    "Name": "Anderson",
    "Place": "Gissinger",
    "Address": "175 Sunset Rd, Lakewood, NJ 08701",
    "Charge": "340",
    "Payment": "340",
    "Bal": "",
    "Paid": "true",
    "ToDo": "",
    "Ready": "True",
    "Sent": "true",
    "Info": "Additional event information",
    "EventDate": "2025-02-02T05:00:00.000Z",
    "Start": "17:30:00",
    "End": "18:30:00",
    "Phone": "718 483 4098",
    "Category": "Bar Mitzvah",
    "Referral": null,
    "CreatedDate": "2024-12-13T03:37:56.000Z",
    "EtagID": "version-hash",
    "updatedAt": "2024-12-13T03:37:56.614Z",
    "createdAt": "2024-12-13T03:37:56.614Z"
  }
]
```

### 9.4 Data Quality Notes
**Inconsistencies to Handle:**
- `Paid`, `Ready`, `Sent` values: "True", "true", empty, or false
- `Charge` and `Payment`: stored as strings ("340") or numbers (340.0)
- Many fields optional/nullable (Bal, ToDo, Referral, Info often empty)
- Need null-safe parsing for all fields

### 9.5 Event Categories Found
- Bar Mitzvah
- Vort
- Bris
- Wedding
- School
- Photoshoot
- Pidyon Haben
- [Others may exist in the data]

### 9.6 Update Endpoints (To Be Confirmed)
**Assumed endpoints for updates:**
- `PUT /photoevents/:id` - Update entire event
- `PATCH /photoevents/:id` - Partial update

**Fields likely updatable:**
- Paid, Ready, Sent (status fields)
- Payment, Charge (financial)
- Info, ToDo (notes)
- All other event details

**To be tested:** CORS, authentication requirements, rate limits

---

## 10. Recent Feature Implementations (Phase 6)

### 10.1 Copy Reference Feature
**Purpose**: Quickly share client references via text message

**Implementation**:
- Location: Event Detail Modal header
- Button design: Clipboard icon (📋) with "Ref" label
- Format: `{Event Name} - {Phone Number}`
- Functionality: Copies to clipboard using expo-clipboard
- Feedback: Green toast notification "✓ Copied to clipboard!"

**Use Case**: When clients ask for photographer references, users can quickly copy the contact info and paste it into a text message.

### 10.2 Toast Notification System
**Purpose**: Non-blocking success feedback without requiring user dismissal

**Design**:
- Color: Green (#22c55e) for success
- Position: Top of modal/screen (80px from top)
- Duration: 3 seconds auto-dismiss
- Style: Rounded corners, shadow, white text
- z-index: 1000 for proper layering

**Notifications**:
1. **Copy Reference**: "✓ Copied to clipboard!" (3s)
2. **Export to Calendar**: "✓ Exported" (3s)
3. **Save Changes**: "✓ Saved" (3s)
4. **Create Event**:
   - With export: "✓ Created & Exported" (2s + delayed modal close)
   - Without export: "✓ Created" (2s + delayed modal close)

**Technical Details**:
- State-based visibility control
- setTimeout for auto-dismiss
- CreateEventModal: 2-second delay before closing to show toast
- Absolute positioning for overlay effect

### 10.3 Google Calendar Integration
**Purpose**: Export events directly to user's Google Calendar

**Features**:
- **OAuth Authentication**: Browser-based Google sign-in
- **Backend Service**: Vercel-hosted OAuth backend at `https://photoevents-backend.vercel.app`
- **Event Creation**: Converts app events to Google Calendar events with:
  - Event name and category
  - Date and time
  - Location (venue + address)
  - Contact phone
  - Notes
- **Token Management**: Stores tokens per user ID

**Authentication Flow**:
1. Check authentication status via `/auth/status`
2. If not authenticated, prompt user to sign in
3. Open browser for Google OAuth
4. Backend handles callback and stores tokens
5. Frontend retries export after successful auth

### 10.4 Google Calendar Auto-Refresh
**Purpose**: Eliminate need to manually re-authenticate when tokens expire

**Problem Solved**:
- Google access tokens expire after ~1 hour
- Users had to manually "try again" after signing in
- Interrupting workflow for re-authentication

**Solution Implementation**:
1. **Detect Token Expiration**: Catch 401 errors from export endpoint
2. **Automatic Re-authentication**:
   - Opens browser automatically for OAuth
   - No user prompt asking "do you want to sign in?"
3. **Smart Polling**:
   - Polls `/auth/status` every 1 second
   - Waits up to 30 seconds for OAuth completion
   - Logs progress in console
4. **Automatic Retry**:
   - Once authentication confirmed, retries export
   - Uses `isRetry` flag to prevent infinite loops
   - Shows success toast when complete

**User Experience**:
- Browser opens briefly for sign-in
- User completes OAuth in browser
- Export automatically completes
- Green toast shows "✓ Exported"
- **Zero manual intervention** beyond signing in

**Technical Details**:
- File: `photoevents-app/src/services/googleCalendarBackendService.ts`
- Functions:
  - `waitForAuthentication()`: Polling mechanism
  - `exportToGoogleCalendar()`: Enhanced with auto-refresh
  - `isAuthenticated()`: Check auth status
  - `authenticateWithGoogle()`: Trigger OAuth flow

### 10.5 Dependencies Added
- **expo-clipboard**: Clipboard operations for Copy Reference feature
  - Installation: `npm install expo-clipboard`
  - Usage: `Clipboard.setStringAsync(text)`

---

## 11. Next Steps

### Immediate Actions
1. ✅ PRD Created and confirmed
2. ✅ API explored and documented
3. ✅ Data structure confirmed
4. ⚠️ **Decide on image strategy** (category icons vs no images vs backend modification)
5. 📋 **Set up Expo React Native project**
6. 🎨 **Implement dark theme design system**
7. 🔌 **Build API integration layer**
8. 📱 **Develop Phase 1 features**

### Testing Strategy
- Test on Expo Go mobile app (scan QR code)
- Test on Android emulator (Android Studio)
- Test on iOS simulator (macOS only, or use Expo Go on physical iOS device)
- Test on Windows PC using web version (limited mobile features)

---

## 11. Design Mockups
[To be created during development]

---

## 12. Additional Feature Suggestions

Based on your requirements, here are some features that could be very helpful:

### 📸 Photo Management
- Upload event photos directly from app
- Photo count indicator per event
- Quick preview/gallery view
- Mark favorite shots

### 💬 Client Communication
- SMS/text client directly from app
- Email integration
- Communication history log
- Quick message templates ("Photos ready!", "Payment reminder")

### 📊 Dashboard/Analytics
- Quick stats widget (total events, unpaid count, revenue)
- Monthly revenue chart
- Busiest days/times
- Client repeat rate

### ⚙️ Settings & Preferences
- Notification preferences
- Default grouping view
- Sort order preferences
- Theme customization (accent colors)
- Data refresh interval

### 🔄 Batch Operations
- Select multiple events
- Batch status updates
- Bulk export selected events
- Mass messaging

### 📍 Location Features
- Map view of event locations
- Directions to venue
- Location-based grouping

### ⏰ Time Management
- Time until next event countdown
- Preparation time warnings
- Schedule conflicts detection

Would you like me to include any of these in the PRD or start with the core features first?

---

**Document Version**: 5.0
**Last Updated**: 2026-02-22
**Status**: Phase 7 Complete - Settings Screen, Sort Order Preference, Navigation App Preference, Google Sign-in Tracking Implemented
