-- Keep appraisal edit records detailed enough for form highlights and reason headers.
SET @audit_old_value_text := (
    SELECT IF(
        EXISTS(
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
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
        EXISTS(
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
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

SET @audit_reason_len := (
    SELECT IF(
        EXISTS(
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'audit_logs'
              AND COLUMN_NAME = 'reason'
        ),
        'ALTER TABLE audit_logs MODIFY COLUMN reason VARCHAR(500) NULL',
        'SELECT ''audit_logs.reason does not exist'' AS message'
    )
);
PREPARE stmt FROM @audit_reason_len;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
