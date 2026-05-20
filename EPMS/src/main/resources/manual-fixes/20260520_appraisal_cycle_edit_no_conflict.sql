-- Run this manually only if your local DB still returns 409 while editing appraisal cycles.
SET @schema_name := DATABASE();

SET @drop_cycle_unique_indexes_sql := (
    SELECT IF(
        COUNT(*) > 0,
        CONCAT(
            'ALTER TABLE appraisal_cycle ',
            GROUP_CONCAT(CONCAT('DROP INDEX `', REPLACE(INDEX_NAME, '`', '``'), '`') SEPARATOR ', ')
        ),
        'SELECT ''No non-primary unique indexes found on appraisal_cycle'' AS message'
    )
    FROM (
        SELECT DISTINCT INDEX_NAME
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'appraisal_cycle'
          AND NON_UNIQUE = 0
          AND INDEX_NAME <> 'PRIMARY'
    ) unique_indexes
);
PREPARE drop_cycle_unique_indexes_stmt FROM @drop_cycle_unique_indexes_sql;
EXECUTE drop_cycle_unique_indexes_stmt;
DEALLOCATE PREPARE drop_cycle_unique_indexes_stmt;
