-- Run this manually only if your existing MySQL schema still has selection_method as an ENUM
-- and Save Evaluators fails with:
-- Data truncated for column 'selection_method'

ALTER TABLE feedback_evaluator_assignments
    MODIFY COLUMN selection_method VARCHAR(40) NOT NULL;
