ALTER TABLE kpi_form_items
    ADD COLUMN kpi_unit_label VARCHAR(100) NULL AFTER kpi_unit_id,
    MODIFY COLUMN kpi_unit_id INT NULL;
