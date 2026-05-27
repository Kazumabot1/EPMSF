-- Evaluator-facing 360 feedback form fields from the client RD.
-- Kept as free text because the business meaning of Assessment Date and Effective Date is not finalized yet.

ALTER TABLE feedback_responses
    ADD COLUMN IF NOT EXISTS assessment_date_text VARCHAR(120) NULL,
    ADD COLUMN IF NOT EXISTS effective_date_text VARCHAR(120) NULL;
