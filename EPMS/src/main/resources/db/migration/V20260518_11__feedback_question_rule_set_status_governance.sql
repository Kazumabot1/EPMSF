-- Rule Set governance status.
-- Product workflow uses Draft / Active / Disabled / Archived, while the legacy
-- active boolean remains as a compatibility flag for older queries.

SET @has_rule_set_status := (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'feedback_question_rule_sets'
      AND column_name = 'status'
);

SET @sql := IF(@has_rule_set_status = 0,
               'ALTER TABLE feedback_question_rule_sets ADD COLUMN status VARCHAR(20) NULL AFTER description',
               'SELECT 1'
            );
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE feedback_question_rule_sets
SET status = CASE WHEN active = 1 THEN 'ACTIVE' ELSE 'DISABLED' END
WHERE status IS NULL OR TRIM(status) = '' OR status = 'INACTIVE';

UPDATE feedback_question_rule_sets
SET active = CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END
WHERE status IN ('DRAFT', 'ACTIVE', 'DISABLED', 'ARCHIVED');

SET @sql := 'ALTER TABLE feedback_question_rule_sets MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT ''ACTIVE''';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
