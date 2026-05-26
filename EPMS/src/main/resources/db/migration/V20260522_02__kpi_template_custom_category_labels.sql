ALTER TABLE kpi_form_items
    ADD COLUMN kpi_category_label VARCHAR(100) NULL AFTER kpi_category_id,
    MODIFY COLUMN kpi_category_id INT NULL;
