-- Make HR appraisal edits save without duplicate-name/index conflicts and keep audit rows short/safe.
-- Local databases from earlier builds may still have unique indexes on appraisal_form_template.
SET @drop_template_unique_indexes_sql := (
    SELECT IFNULL(
        GROUP_CONCAT(
            CONCAT('DROP INDEX `', INDEX_NAME, '`')
            SEPARATOR ', '
        ),
        'ADD COLUMN `_appraisal_template_no_unique_to_drop` INT NULL, DROP COLUMN `_appraisal_template_no_unique_to_drop`'
    )
    FROM (
        SELECT DISTINCT INDEX_NAME
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'appraisal_form_template'
          AND NON_UNIQUE = 0
          AND INDEX_NAME <> 'PRIMARY'
    ) unique_indexes
);
SET @drop_template_unique_indexes_sql := CONCAT('ALTER TABLE appraisal_form_template ', @drop_template_unique_indexes_sql);
PREPARE drop_template_unique_indexes_stmt FROM @drop_template_unique_indexes_sql;
EXECUTE drop_template_unique_indexes_stmt;
DEALLOCATE PREPARE drop_template_unique_indexes_stmt;

SET @audit_old_sql := (
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
PREPARE audit_old_stmt FROM @audit_old_sql;
EXECUTE audit_old_stmt;
DEALLOCATE PREPARE audit_old_stmt;

SET @audit_new_sql := (
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
PREPARE audit_new_stmt FROM @audit_new_sql;
EXECUTE audit_new_stmt;
DEALLOCATE PREPARE audit_new_stmt;

SET @audit_changed_column_sql := (
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
PREPARE audit_changed_column_stmt FROM @audit_changed_column_sql;
EXECUTE audit_changed_column_stmt;
DEALLOCATE PREPARE audit_changed_column_stmt;
