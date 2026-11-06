-- Add Google Calendar event ID column to events table
-- Run this in the Supabase SQL Editor once.
-- After export, the app stores the calendar event ID here.
-- When you edit and save an event, the old calendar entry is deleted
-- and a new one is created automatically.

ALTER TABLE events ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;
