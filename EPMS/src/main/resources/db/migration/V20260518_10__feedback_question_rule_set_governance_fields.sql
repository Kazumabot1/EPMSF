-- Governance fields for human-readable Rule Sets.
-- Rule Sets need a stable HR-facing name/purpose so duplicated or scoped sets
-- remain understandable when the list grows.

SET @has_rule_set_description := (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'feedback_question_rule_sets'
      AND column_name = 'description'
);

SET @sql := IF(@has_rule_set_description = 0,
               'ALTER TABLE feedback_question_rule_sets ADD COLUMN description VARCHAR(500) NULL AFTER name',
               'SELECT 1'
            );
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Keep legacy/generated names usable, but make sure blank names cannot remain.
UPDATE feedback_question_rule_sets
SET name = CONCAT('L', LPAD(target_level_min_rank, 2, '0'), '–L', LPAD(target_level_max_rank, 2, '0'), ' Rule Set')
WHERE name IS NULL OR TRIM(name) = '';
