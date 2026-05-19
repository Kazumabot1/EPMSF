ALTER TABLE employee_kpi_forms
    ADD COLUMN kpi_template_cycle_id INT NULL,
    ADD COLUMN finalized_by_user_id INT NULL,
    ADD COLUMN early_finalized_reason TEXT NULL,
    ADD COLUMN finalized_before_end_date BIT NULL;

ALTER TABLE employee_kpi_forms
    ADD CONSTRAINT fk_employee_kpi_forms_cycle
        FOREIGN KEY (kpi_template_cycle_id) REFERENCES kpi_template_cycle(id);

ALTER TABLE employee_kpi_forms
    ADD CONSTRAINT fk_employee_kpi_forms_finalized_by
        FOREIGN KEY (finalized_by_user_id) REFERENCES users(id);
