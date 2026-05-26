-- Restore existing Question Rules after the Rule Sets redesign.
-- Old rules were stored with question_version_id only. The redesign stores question_bank_id,
-- so this migration backfills bank references before the UI groups them into Rule Sets.

ALTER TABLE feedback_question_applicability_rules
    ADD COLUMN IF NOT EXISTS question_bank_id BIGINT NULL AFTER id;

UPDATE feedback_question_applicability_rules r
    JOIN feedback_question_versions qv ON qv.id = r.question_version_id
    LEFT JOIN feedback_question_bank existing_qb ON existing_qb.id = r.question_bank_id
SET r.question_bank_id = qv.question_bank_id
WHERE r.question_version_id IS NOT NULL
  AND (r.question_bank_id IS NULL OR r.question_bank_id = 0 OR existing_qb.id IS NULL);

-- Keep unusable broken rows for history, but do not let them participate in rules.
UPDATE feedback_question_applicability_rules r
    LEFT JOIN feedback_question_bank qb ON qb.id = r.question_bank_id
SET r.active = FALSE,
    r.question_bank_id = NULL
WHERE r.question_bank_id IS NOT NULL
  AND qb.id IS NULL;
