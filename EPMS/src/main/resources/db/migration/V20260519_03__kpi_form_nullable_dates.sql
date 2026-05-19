-- KPI forms are reusable templates; cycle dates live in kpi_template_cycle.
-- Existing MySQL schemas may still have NOT NULL dates from the old model.
ALTER TABLE kpi_form MODIFY COLUMN start_date DATE NULL;
ALTER TABLE kpi_form MODIFY COLUMN end_date DATE NULL;
