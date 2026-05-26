ALTER TABLE kpi_template_cycle
    ADD COLUMN last_edit_reason VARCHAR(1000) NULL;

ALTER TABLE department_kpi_cycle
    ADD COLUMN last_edit_reason VARCHAR(1000) NULL;
