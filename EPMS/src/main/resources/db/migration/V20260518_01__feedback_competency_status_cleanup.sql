-- Question Bank competencies are library categories, not workflow items.
-- Keep the column for compatibility, but normalize all existing competencies to usable ACTIVE records.

INSERT INTO feedback_competencies (code, name, description, category, default_weight_percent, display_order, status)
SELECT DISTINCT
    qb.competency_code,
    REPLACE(qb.competency_code, '_', ' '),
    'Imported from existing question bank data.',
    'PERFORMANCE_360',
    0,
    500,
    'ACTIVE'
FROM feedback_question_bank qb
         LEFT JOIN feedback_competencies fc ON UPPER(fc.code) = UPPER(qb.competency_code)
WHERE qb.competency_code IS NOT NULL
  AND qb.competency_code <> ''
  AND fc.id IS NULL;

UPDATE feedback_competencies
SET status = 'ACTIVE'
WHERE status IS NULL OR status <> 'ACTIVE';
