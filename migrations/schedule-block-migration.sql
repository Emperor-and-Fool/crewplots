-- Schedule Block Migration Script
-- Migrates data from week_schedules to schedule_blocks architecture
-- Created: June 29, 2025

BEGIN;

-- 1. Backup existing week_schedules data
CREATE TABLE week_schedules_backup AS 
SELECT * FROM week_schedules;

-- 2. Create schedule blocks from existing week schedules
-- Each existing week schedule becomes a schedule block containing one week
INSERT INTO schedule_blocks (name, description, location_id, created_by, max_weeks, is_active, created_at, updated_at)
SELECT 
  name,
  description,
  location_id,
  created_by,
  1 as max_weeks, -- Single week for existing schedules
  is_active,
  created_at,
  updated_at
FROM week_schedules;

-- 3. Add temporary mapping columns to week_schedules
ALTER TABLE week_schedules ADD COLUMN temp_schedule_block_id INTEGER;
ALTER TABLE week_schedules ADD COLUMN temp_week_number INTEGER DEFAULT 1;

-- 4. Map week schedules to their corresponding schedule blocks
-- Match by created_by, location_id, and created_at to ensure correct pairing
UPDATE week_schedules 
SET temp_schedule_block_id = sb.id,
    temp_week_number = 1
FROM schedule_blocks sb
WHERE week_schedules.created_by = sb.created_by
  AND week_schedules.location_id = sb.location_id
  AND week_schedules.created_at = sb.created_at
  AND week_schedules.name = sb.name;

-- 5. Verify all week schedules have been mapped
DO $$
DECLARE
  unmapped_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unmapped_count 
  FROM week_schedules 
  WHERE temp_schedule_block_id IS NULL;
  
  IF unmapped_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % week schedules could not be mapped to schedule blocks', unmapped_count;
  END IF;
END $$;

-- 6. Drop old columns and rename temp columns
ALTER TABLE week_schedules DROP COLUMN name;
ALTER TABLE week_schedules DROP COLUMN description;
ALTER TABLE week_schedules DROP COLUMN location_id;
ALTER TABLE week_schedules DROP COLUMN is_active;
ALTER TABLE week_schedules DROP COLUMN multi_week_frame_id;

-- Rename temp columns to final names
ALTER TABLE week_schedules RENAME COLUMN temp_schedule_block_id TO schedule_block_id;
ALTER TABLE week_schedules RENAME COLUMN temp_week_number TO week_number;

-- 7. Add constraints and indexes
ALTER TABLE week_schedules ALTER COLUMN schedule_block_id SET NOT NULL;
ALTER TABLE week_schedules ADD CONSTRAINT fk_week_schedules_schedule_block 
  FOREIGN KEY (schedule_block_id) REFERENCES schedule_blocks(id);

-- Add unique constraint for schedule_block_id + week_number
ALTER TABLE week_schedules ADD CONSTRAINT week_schedules_block_week_unique 
  UNIQUE (schedule_block_id, week_number);

-- Add indexes
CREATE INDEX idx_week_schedules_block ON week_schedules(schedule_block_id);

-- 8. Update shifts table to maintain week_schedule_id references
-- No changes needed - shifts still reference week_schedules.id

-- 9. Verification queries
SELECT 'Migration Summary:' as status;
SELECT COUNT(*) as schedule_blocks_created FROM schedule_blocks;
SELECT COUNT(*) as week_schedules_updated FROM week_schedules WHERE schedule_block_id IS NOT NULL;
SELECT COUNT(*) as shifts_preserved FROM shifts;

COMMIT;

-- Success message
SELECT 'Schedule block migration completed successfully!' as result;