-- Align Question Bank wording with the HR UI: inactive is the non-active history state.
UPDATE feedback_question_bank
SET status = 'INACTIVE'
WHERE status = 'RETIRED';

-- Competency descriptions are no longer shown or maintained in Question Bank.
UPDATE feedback_competencies
SET description = NULL
WHERE description IS NOT NULL;
