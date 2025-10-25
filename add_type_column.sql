-- Add 'type' column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'panel' 
CHECK (type IN ('panel', 'poll', 'quiz'));

-- Update existing events to have 'panel' type
UPDATE events 
SET type = 'panel' 
WHERE type IS NULL;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name = 'type';