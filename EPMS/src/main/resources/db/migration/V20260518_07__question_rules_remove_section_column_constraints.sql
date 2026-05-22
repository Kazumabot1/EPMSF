-- Question Rules no longer uses sections. Existing installations may still have
-- NOT NULL section columns from the old form-builder design. Hibernate ddl-auto=update
-- does not reliably relax those constraints, so this explicit cleanup keeps the
-- table compatible with sectionless rule rows.

ALTER TABLE feedback_question_applicability_rules
    MODIFY COLUMN section_code VARCHAR(80) NULL,
    MODIFY COLUMN section_title VARCHAR(150) NULL,
    MODIFY COLUMN section_order INT NULL;

UPDATE feedback_question_applicability_rules
SET section_code = NULL,
    section_title = NULL,
    section_order = NULL
WHERE section_code = 'SECTION_REMOVED'
   OR section_title = 'Question Rules';
