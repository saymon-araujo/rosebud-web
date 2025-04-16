-- Add notification_id column to reminders table
ALTER TABLE reminders
ADD COLUMN notification_id TEXT;
