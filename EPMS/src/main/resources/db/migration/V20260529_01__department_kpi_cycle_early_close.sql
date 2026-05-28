ALTER TABLE department_kpi_cycle
    ADD COLUMN duration_years INT NOT NULL DEFAULT 1,
    ADD COLUMN closing_requested_at DATETIME(6) NULL,
    ADD COLUMN grace_ends_at DATETIME(6) NULL,
    ADD COLUMN closed_at DATETIME(6) NULL,
    ADD COLUMN early_close_reason VARCHAR(1000) NULL,
    ADD COLUMN grace_extension VARCHAR(30) NULL,
    ADD COLUMN early_close_requested_at DATETIME(6) NULL,
    ADD COLUMN early_close_requested_by INT NULL,
    ADD COLUMN early_close_reviewed_at DATETIME(6) NULL,
    ADD COLUMN early_close_reviewed_by INT NULL,
    ADD COLUMN early_close_review_decision VARCHAR(30) NULL,
    ADD COLUMN early_close_review_reason VARCHAR(1000) NULL;

ALTER TABLE department_kpi_cycle
    ADD CONSTRAINT fk_dept_kpi_cycle_early_close_requested_by
        FOREIGN KEY (early_close_requested_by) REFERENCES users(id);

ALTER TABLE department_kpi_cycle
    ADD CONSTRAINT fk_dept_kpi_cycle_early_close_reviewed_by
        FOREIGN KEY (early_close_reviewed_by) REFERENCES users(id);
