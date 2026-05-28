-- Align Feedback 360 evaluator selection method storage with the ranked evaluator workflow.
-- The application uses AUTO_RANKED for score-based peer suggestions. MySQL ENUM columns
-- created before that value existed reject the insert with "Data truncated for column
-- 'selection_method'". Use VARCHAR so future selection method names do not require
-- another enum DDL change.

ALTER TABLE feedback_evaluator_assignments
    MODIFY COLUMN selection_method VARCHAR(40) NOT NULL;
