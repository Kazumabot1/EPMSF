-- Fix appraisal cycle edit 409 conflict caused by legacy unique index and old audit log column sizes.
-- Safe to run more than once on MySQL.

SET @drop_cycle_unique := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'appraisal_cycle'
        AND INDEX_NAME = 'uk_appraisal_cycle_type_year_period'
    ),
    'ALTER TABLE appraisal_cycle DROP INDEX uk_appraisal_cycle_type_year_period',
    'SELECT ''uk_appraisal_cycle_type_year_period does not exist'' AS message'
  )
);
PREPARE stmt FROM @drop_cycle_unique;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @audit_old_value_text := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'audit_logs'
        AND COLUMN_NAME = 'old_value'
    ),
    'ALTER TABLE audit_logs MODIFY COLUMN old_value TEXT NULL',
    'SELECT ''audit_logs.old_value does not exist'' AS message'
  )
);
PREPARE stmt FROM @audit_old_value_text;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @audit_new_value_text := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'audit_logs'
        AND COLUMN_NAME = 'new_value'
    ),
    'ALTER TABLE audit_logs MODIFY COLUMN new_value TEXT NULL',
    'SELECT ''audit_logs.new_value does not exist'' AS message'
  )
);
PREPARE stmt FROM @audit_new_value_text;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @audit_changed_column := (
  SELECT IF(
    NOT EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'audit_logs'
        AND COLUMN_NAME = 'changed_column'
    ),
    'ALTER TABLE audit_logs ADD COLUMN changed_column VARCHAR(255) NULL AFTER entity_id',
    'SELECT ''audit_logs.changed_column already exists'' AS message'
  )
);
PREPARE stmt FROM @audit_changed_column;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
