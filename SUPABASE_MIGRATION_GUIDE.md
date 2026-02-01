# MongoDB to Supabase Migration Guide

This guide will help you migrate your Photo Events data from MongoDB to Supabase (PostgreSQL).

## Step 1: Set Up Supabase

### 1.1 Create a Supabase Account
1. Go to https://supabase.com
2. Sign up for a free account
3. Create a new project
   - Choose a project name (e.g., "PhotoEvents")
   - Set a strong database password
   - Select a region close to you

### 1.2 Get Your Credentials
Once your project is created:
1. Go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: https://xxxxx.supabase.co)
   - **anon public** key (long string starting with eyJ...)

## Step 2: Create the Database Table

1. In Supabase, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase-schema.sql`
4. Paste it into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)

You should see: "Success. No rows returned"

This creates:
- ✅ The `events` table with all fields
- ✅ Indexes for fast queries
- ✅ Row Level Security (RLS) policies
- ✅ Auto-updating timestamp triggers

## Step 3: Configure the Import Script

### Option A: Using Environment Variables (Recommended - More Secure)

Open Command Prompt and set these variables:

```cmd
SET SUPABASE_URL=https://your-project.supabase.co
SET SUPABASE_ANON_KEY=your-anon-public-key-here
```

### Option B: Edit the Script Directly

1. Open `import-to-supabase.js` in a text editor
2. Find these lines near the top:
   ```javascript
   const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE';
   const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE';
   ```
3. Replace the placeholder values with your actual credentials

## Step 4: Install Dependencies

```cmd
cd c:\Projects\AI\Phtotevents4
npm install @supabase/supabase-js
```

## Step 5: Run the Import

```cmd
node import-to-supabase.js
```

Or specify a different CSV file:

```cmd
node import-to-supabase.js photoevents-export-2026-01-28T19-21-14.csv
```

The script will:
- ✅ Connect to Supabase
- ✅ Read your MongoDB CSV export
- ✅ Convert MongoDB format to PostgreSQL format
- ✅ Import in batches of 100 events
- ✅ Show progress and summary

## Step 6: Verify the Import

1. Go to Supabase **Table Editor**
2. Click on the **events** table
3. You should see all your events!

You can also run a SQL query:

```sql
SELECT COUNT(*) FROM events;
```

## Step 7: Update Your Mobile App

Once data is in Supabase, update your React Native app:

### Install Supabase Client

```bash
cd photoevents-app
npm install @supabase/supabase-js
```

### Create Supabase Config

Create `photoevents-app/src/services/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-public-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### Update API Service

Modify `photoevents-app/src/services/api.ts` to use Supabase instead of the old API.

## Benefits of Supabase

✅ **Real-time subscriptions** - Events update live across devices
✅ **Built-in authentication** - Easy user management
✅ **Row Level Security** - Fine-grained access control
✅ **Auto-generated API** - REST and GraphQL endpoints
✅ **Storage** - Built-in file storage for photos
✅ **Edge Functions** - Run serverless functions
✅ **Free tier** - Generous limits for small projects

## Data Mapping

MongoDB → Supabase:

| MongoDB Field | Supabase Field | Type | Notes |
|--------------|----------------|------|-------|
| _id | mongodb_id | TEXT | Original ID stored for reference |
| (auto) | id | UUID | New Supabase primary key |
| Name | name | TEXT | Event/client name |
| EventDate | event_date | TIMESTAMPTZ | With timezone |
| Start | start_time | TEXT | HH:MM:SS format |
| End | end_time | TEXT | HH:MM:SS format |
| Category | category | TEXT | Event type |
| Place | place | TEXT | Venue name |
| Address | address | TEXT | Full address |
| Phone | phone | TEXT | Contact number |
| Charge | charge | NUMERIC | Decimal for currency |
| Payment | payment | NUMERIC | Decimal for currency |
| Bal | balance | NUMERIC | Calculated balance |
| Paid | paid | BOOLEAN | True/false (not "True"/"") |
| Ready | ready | BOOLEAN | True/false |
| Sent | sent | BOOLEAN | True/false |
| Info | info | TEXT | Notes |
| ToDo | todo | TEXT | Todo items |
| Referral | referral | TEXT | Referral source |
| CreatedDate | created_date | TIMESTAMPTZ | Original creation |
| EtagID | etag_id | TEXT | Version ID |
| createdAt | created_at | TIMESTAMPTZ | Auto-managed |
| updatedAt | updated_at | TIMESTAMPTZ | Auto-updated |

## Troubleshooting

### Error: "duplicate key value violates unique constraint"
- Some events already exist in the database
- Either delete existing data or modify the script to update instead of insert

### Error: "relation 'events' does not exist"
- Run the schema SQL first (Step 2)

### Error: "permission denied for table events"
- Check your RLS policies
- Make sure you're using the correct API key

### Import is slow
- Normal for large datasets
- The script imports 100 events at a time
- 530 events should take ~1 minute

## Next Steps

After successful migration:

1. Test queries in Supabase SQL Editor
2. Update mobile app to use Supabase
3. Enable real-time subscriptions if needed
4. Add user authentication
5. Set up backups
6. Configure storage for event photos

## Need Help?

- Supabase Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com
- Stack Overflow: Tag with `supabase`
