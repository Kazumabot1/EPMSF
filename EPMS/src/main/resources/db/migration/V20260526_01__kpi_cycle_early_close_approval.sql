ALTER TABLE kpi_template_cycle
    ADD COLUMN early_close_reason VARCHAR(1000) NULL,
    ADD COLUMN grace_extension VARCHAR(30) NULL,
    ADD COLUMN early_close_requested_at DATETIME(6) NULL,
    ADD COLUMN early_close_requested_by INT NULL,
    ADD COLUMN early_close_reviewed_at DATETIME(6) NULL,
    ADD COLUMN early_close_reviewed_by INT NULL,
    ADD COLUMN early_close_review_decision VARCHAR(30) NULL,
    ADD COLUMN early_close_review_reason VARCHAR(1000) NULL;

ALTER TABLE kpi_template_cycle
    ADD CONSTRAINT fk_kpi_cycle_early_close_requested_by
        FOREIGN KEY (early_close_requested_by) REFERENCES users(id),
    ADD CONSTRAINT fk_kpi_cycle_early_close_reviewed_by
        FOREIGN KEY (early_close_reviewed_by) REFERENCES users(id);

ALTER TABLE kpi_template_cycle
    MODIFY COLUMN status ENUM('DRAFT', 'ACTIVE', 'PENDING_APPROVAL', 'CLOSING', 'DEACTIVATED') NOT NULL;
