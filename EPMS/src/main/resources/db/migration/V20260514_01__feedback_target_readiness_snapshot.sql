-- Target Selection and People Readiness Foundation
-- Allows campaign targets to be saved before question review and stores a stable snapshot for later evaluator generation/reporting.

ALTER TABLE feedback_requests
    MODIFY COLUMN form_id BIGINT NULL;

ALTER TABLE feedback_requests
    ADD COLUMN IF NOT EXISTS target_user_id INT NULL,
    ADD COLUMN IF NOT EXISTS target_employee_code VARCHAR(80) NULL,
    ADD COLUMN IF NOT EXISTS target_employee_name VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS target_employee_email VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS target_parent_department_id INT NULL,
    ADD COLUMN IF NOT EXISTS target_parent_department_name VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS target_current_department_id INT NULL,
    ADD COLUMN IF NOT EXISTS target_current_department_name VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS target_position_id INT NULL,
    ADD COLUMN IF NOT EXISTS target_position_name VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS target_level_code VARCHAR(80) NULL,
    ADD COLUMN IF NOT EXISTS target_manager_user_id INT NULL,
    ADD COLUMN IF NOT EXISTS target_manager_employee_id INT NULL,
    ADD COLUMN IF NOT EXISTS target_manager_name VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS target_employment_status VARCHAR(80) NULL,
    ADD COLUMN IF NOT EXISTS target_warning_snapshot TEXT NULL,
    ADD COLUMN IF NOT EXISTS selected_at DATETIME NULL,
    ADD COLUMN IF NOT EXISTS selected_by_user_id BIGINT NULL;
