-- Run this manually if review auto-save still fails because the existing DB column is NOT NULL.
ALTER TABLE appraisal_review
    MODIFY COLUMN submitted_at DATETIME(6) NULL;
