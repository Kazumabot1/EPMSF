-- Real Rule Set identity for the Rule Sets UI.
-- Internal applicability rows remain role/question-specific, but separate duplicated
-- rule sets need a stable parent id so they never silently merge in the UI or during
-- activate/disable operations.

CREATE TABLE IF NOT EXISTS feedback_question_rule_sets (
                                                           id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                                           name VARCHAR(180) NOT NULL,
                                                           target_level_min_rank INT NOT NULL,
                                                           target_level_max_rank INT NOT NULL,
                                                           target_department_id BIGINT NULL,
                                                           target_position_id BIGINT NULL,
                                                           active BOOLEAN NOT NULL DEFAULT TRUE,
                                                           created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                                           updated_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6)
);

SET @has_rule_set_id := (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'feedback_question_applicability_rules'
      AND column_name = 'rule_set_id'
);

SET @sql := IF(@has_rule_set_id = 0,
               'ALTER TABLE feedback_question_applicability_rules ADD COLUMN rule_set_id BIGINT NULL AFTER id',
               'SELECT 1'
            );
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Migrate legacy rows into parent rule sets. Existing data did not have a real
-- rule-set identity, so the safest migration groups the old rows by their existing
-- visible scope and active state. New duplicate rule sets created after this migration
-- always get their own parent id.
INSERT INTO feedback_question_rule_sets (
    name,
    target_level_min_rank,
    target_level_max_rank,
    target_department_id,
    target_position_id,
    active,
    created_at,
    updated_at
)
SELECT
    CONCAT('L', LPAD(r.target_level_min_rank, 2, '0'), '–L', LPAD(r.target_level_max_rank, 2, '0'), ' Rule Set') AS name,
    r.target_level_min_rank,
    r.target_level_max_rank,
    r.target_department_id,
    r.target_position_id,
    COALESCE(r.active, TRUE) AS active,
    COALESCE(MIN(r.created_at), CURRENT_TIMESTAMP(6)) AS created_at,
    COALESCE(MAX(r.updated_at), CURRENT_TIMESTAMP(6)) AS updated_at
FROM feedback_question_applicability_rules r
WHERE r.rule_set_id IS NULL
GROUP BY
    r.target_level_min_rank,
    r.target_level_max_rank,
    r.target_department_id,
    r.target_position_id,
    COALESCE(r.active, TRUE);

UPDATE feedback_question_applicability_rules r
    JOIN feedback_question_rule_sets rs
    ON rs.target_level_min_rank = r.target_level_min_rank
        AND rs.target_level_max_rank = r.target_level_max_rank
        AND ((rs.target_department_id IS NULL AND r.target_department_id IS NULL) OR rs.target_department_id = r.target_department_id)
        AND ((rs.target_position_id IS NULL AND r.target_position_id IS NULL) OR rs.target_position_id = r.target_position_id)
        AND rs.active = COALESCE(r.active, TRUE)
SET r.rule_set_id = rs.id
WHERE r.rule_set_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_question_rules_rule_set
    ON feedback_question_applicability_rules (rule_set_id, active);

CREATE INDEX IF NOT EXISTS idx_feedback_question_rule_sets_scope
    ON feedback_question_rule_sets (active, target_level_min_rank, target_level_max_rank, target_department_id, target_position_id);
