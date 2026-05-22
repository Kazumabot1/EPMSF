-- Question Rules now reference feedback_question_bank rows. question_version_id is
-- retained only for backward compatibility with older rule rows and legacy reports.
-- Some existing MySQL schemas still have this old column as NOT NULL, which breaks
-- new Rule Set inserts. Relax it safely and backfill from question_bank_id where possible.

UPDATE feedback_question_applicability_rules r
    JOIN feedback_question_bank q ON q.id = r.question_bank_id
    JOIN feedback_question_versions v ON v.question_bank_id = q.id AND v.active = TRUE
SET r.question_version_id = v.id
WHERE r.question_version_id IS NULL;

SET @has_question_version_id := (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'feedback_question_applicability_rules'
      AND column_name = 'question_version_id'
);

SET @sql := IF(@has_question_version_id > 0,
               'ALTER TABLE feedback_question_applicability_rules MODIFY COLUMN question_version_id BIGINT NULL',
               'SELECT 1'
            );
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
