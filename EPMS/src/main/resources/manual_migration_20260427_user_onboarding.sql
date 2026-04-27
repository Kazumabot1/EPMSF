-- Manual schema migration for secure onboarding and first-login password change.
-- Review and adapt column types/defaults for your production database before running.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS employee_id INT NULL,
    ADD COLUMN IF NOT EXISTS must_change_password TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS password_changed_at DATETIME NULL,
    ADD COLUMN IF NOT EXISTS last_temporary_password_sent_at DATETIME NULL,
    ADD COLUMN IF NOT EXISTS account_status VARCHAR(64) NULL;

ALTER TABLE employee
    ADD COLUMN IF NOT EXISTS email VARCHAR(255) NULL;

CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_email ON employee(email);
