-- =============================================================
-- 1:1 Meetings Schema Migration  (MySQL 8.0 compatible)
-- Run ONCE before restarting Spring Boot.
-- ddl-auto=update will automatically add new columns
-- (parent_meeting_id, updated_at). This script only handles
-- the TYPE CHANGES that Hibernate cannot do automatically.
-- =============================================================

-- ---------------------------------------------------------------
-- one_on_one_meetings: change column types
-- ---------------------------------------------------------------

-- status: VARCHAR(255) → BIT(1)
ALTER TABLE one_on_one_meetings
    MODIFY COLUMN status BIT(1) NOT NULL DEFAULT 0;

-- scheduled_date → DATETIME
ALTER TABLE one_on_one_meetings
    MODIFY COLUMN scheduled_date DATETIME;

-- follow_up_date → DATETIME
ALTER TABLE one_on_one_meetings
    MODIFY COLUMN follow_up_date DATETIME;

-- is_finalized → DATETIME (NULL = not finalized)
ALTER TABLE one_on_one_meetings
    MODIFY COLUMN is_finalized DATETIME;

-- created_at → DATETIME
ALTER TABLE one_on_one_meetings
    MODIFY COLUMN created_at DATETIME;

-- ---------------------------------------------------------------
-- one_on_one_action_items: fix description type
-- ---------------------------------------------------------------
ALTER TABLE one_on_one_action_items
    MODIFY COLUMN description TEXT;

-- ---------------------------------------------------------------
-- Add UNIQUE constraint on meeting_id (OneToOne enforcement)
-- Ignore if already exists.
-- ---------------------------------------------------------------
SET @exists := (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'one_on_one_action_items'
      AND CONSTRAINT_NAME = 'uq_ooai_meeting'
);
SET @sql := IF(@exists = 0,
    'ALTER TABLE one_on_one_action_items ADD CONSTRAINT uq_ooai_meeting UNIQUE (meeting_id)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
