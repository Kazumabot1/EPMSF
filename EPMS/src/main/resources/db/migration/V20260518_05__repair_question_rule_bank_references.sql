-- Repair data left by the Question Rules redesign before Hibernate/JPA can use question_bank_id safely.
-- Existing installations may already contain feedback_question_applicability_rules rows that were created
-- with question_version_id only, or with question_bank_id = 0 / stale ids. Those rows cannot accept a real
-- foreign key to feedback_question_bank until they are backfilled.

ALTER TABLE feedback_question_applicability_rules
    ADD COLUMN IF NOT EXISTS question_bank_id BIGINT NULL AFTER id;

-- Backfill missing or invalid question_bank_id values from the old question_version_id reference.
UPDATE feedback_question_applicability_rules r
    LEFT JOIN feedback_question_bank existing_qb ON existing_qb.id = r.question_bank_id
    JOIN feedback_question_versions qv ON qv.id = r.question_version_id
SET r.question_bank_id = qv.question_bank_id
WHERE r.question_bank_id IS NULL
   OR r.question_bank_id = 0
   OR existing_qb.id IS NULL;

-- Any rule that still cannot be mapped to a real question bank item is legacy-broken data.
-- Keep it for audit/history, but deactivate it and clear the broken bank reference so application queries skip it.
UPDATE feedback_question_applicability_rules r
    LEFT JOIN feedback_question_bank qb ON qb.id = r.question_bank_id
SET r.active = FALSE,
    r.question_bank_id = NULL
WHERE qb.id IS NULL;

-- Keep old version/section/scoring columns nullable for backward compatibility.
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
