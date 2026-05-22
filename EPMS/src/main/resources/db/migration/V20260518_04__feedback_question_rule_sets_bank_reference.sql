-- Question Rules redesign: UI manages rule sets, database stores role-specific internal rows.
-- Rules now reference question bank items. Campaign activation/assignment snapshot resolves
-- the exact active question version at that time.

ALTER TABLE feedback_question_applicability_rules
    ADD COLUMN IF NOT EXISTS question_bank_id BIGINT NULL AFTER id;

UPDATE feedback_question_applicability_rules r
    JOIN feedback_question_versions qv ON qv.id = r.question_version_id
SET r.question_bank_id = qv.question_bank_id
WHERE r.question_bank_id IS NULL;

-- Keep historical columns nullable for backward compatibility with already-applied migrations,
-- but new application code no longer writes or reads them for Question Rules.
ALTER TABLE feedback_question_applicability_rules
    MODIFY COLUMN question_version_id BIGINT NULL,
    MODIFY COLUMN section_code VARCHAR(80) NULL,
    MODIFY COLUMN section_title VARCHAR(150) NULL,
    MODIFY COLUMN section_order INT NULL,
    MODIFY COLUMN required_override BOOLEAN NULL,
    MODIFY COLUMN weight_override DOUBLE NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_question_rules_bank_lookup
    ON feedback_question_applicability_rules (active, question_bank_id, evaluator_relationship_type, target_level_min_rank, target_level_max_rank);

CREATE INDEX IF NOT EXISTS idx_feedback_question_rules_scope_specificity
    ON feedback_question_applicability_rules (target_position_id, target_department_id, display_order);
