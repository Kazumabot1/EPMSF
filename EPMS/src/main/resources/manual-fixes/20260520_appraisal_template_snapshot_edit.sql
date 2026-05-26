-- HR template edits are saved as fresh template snapshots so old cycles/forms keep their original structure.
-- Remove older local unique constraints that can block saving a new snapshot with the same visible template name.
SET @drop_appraisal_template_unique_indexes_sql := (
    SELECT IFNULL(
        GROUP_CONCAT(CONCAT('DROP INDEX `', INDEX_NAME, '`') SEPARATOR ', '),
        'ADD COLUMN `_appraisal_template_no_unique_to_drop_v2` INT NULL, DROP COLUMN `_appraisal_template_no_unique_to_drop_v2`'
    )
    FROM (
        SELECT DISTINCT INDEX_NAME
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'appraisal_form_template'
          AND NON_UNIQUE = 0
          AND INDEX_NAME <> 'PRIMARY'
    ) template_unique_indexes
);
SET @drop_appraisal_template_unique_indexes_sql := CONCAT('ALTER TABLE appraisal_form_template ', @drop_appraisal_template_unique_indexes_sql);
PREPARE drop_appraisal_template_unique_indexes_stmt FROM @drop_appraisal_template_unique_indexes_sql;
EXECUTE drop_appraisal_template_unique_indexes_stmt;
DEALLOCATE PREPARE drop_appraisal_template_unique_indexes_stmt;

-- Keep the hidden old template marker available on older databases.
SET @cycle_specific_copy_sql := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'appraisal_form_template'
              AND COLUMN_NAME = 'cycle_specific_copy'
        ),
        'ALTER TABLE appraisal_form_template MODIFY COLUMN cycle_specific_copy BOOLEAN NOT NULL DEFAULT FALSE',
        'ALTER TABLE appraisal_form_template ADD COLUMN cycle_specific_copy BOOLEAN NOT NULL DEFAULT FALSE'
    )
);
PREPARE cycle_specific_copy_stmt FROM @cycle_specific_copy_sql;
EXECUTE cycle_specific_copy_stmt;
DEALLOCATE PREPARE cycle_specific_copy_stmt;
