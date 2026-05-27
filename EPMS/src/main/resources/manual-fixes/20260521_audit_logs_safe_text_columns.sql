-- Make appraisal edit history safe for longer field lists.
-- The application also truncates audit values defensively, so this migration is additive safety.
SET @ddl := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'audit_logs'
              AND COLUMN_NAME = 'old_value'
        ),
        'ALTER TABLE audit_logs MODIFY COLUMN old_value TEXT NULL',
        'SELECT ''audit_logs.old_value does not exist'' AS message'
    )
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'audit_logs'
              AND COLUMN_NAME = 'new_value'
        ),
        'ALTER TABLE audit_logs MODIFY COLUMN new_value TEXT NULL',
        'SELECT ''audit_logs.new_value does not exist'' AS message'
    )
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'audit_logs'
              AND COLUMN_NAME = 'changed_column'
        ),
        'ALTER TABLE audit_logs MODIFY COLUMN changed_column VARCHAR(255) NULL',
        'ALTER TABLE audit_logs ADD COLUMN changed_column VARCHAR(255) NULL AFTER entity_id'
    )
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'audit_logs'
              AND COLUMN_NAME = 'reason'
        ),
        'ALTER TABLE audit_logs MODIFY COLUMN reason VARCHAR(500) NULL',
        'SELECT ''audit_logs.reason does not exist'' AS message'
    )
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
