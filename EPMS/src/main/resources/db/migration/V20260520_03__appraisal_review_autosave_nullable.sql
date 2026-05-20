-- Auto-save creates draft review rows before final submission, so submitted_at must be nullable.
ALTER TABLE appraisal_review
    MODIFY COLUMN submitted_at DATETIME(6) NULL;
