ALTER TABLE kpi_positions
    ADD COLUMN duration_months INT NOT NULL DEFAULT 12;

ALTER TABLE kpi_template_cycle
    ADD COLUMN duration_years INT NOT NULL DEFAULT 1;

UPDATE kpi_template_cycle
SET duration_years = GREATEST(1, LEAST(5, CEIL(COALESCE(duration_months, 12) / 12)));

ALTER TABLE kpi_template_cycle_period
    ADD COLUMN kpi_form_id INT NULL;

UPDATE kpi_template_cycle_period p
JOIN kpi_template_cycle_form cf ON cf.cycle_id = p.cycle_id
SET p.kpi_form_id = cf.kpi_form_id
WHERE p.kpi_form_id IS NULL
  AND (
    SELECT COUNT(*)
    FROM kpi_template_cycle_form cf_count
    WHERE cf_count.cycle_id = p.cycle_id
  ) = 1;

ALTER TABLE kpi_template_cycle_period
    ADD CONSTRAINT fk_kpi_cycle_period_form
        FOREIGN KEY (kpi_form_id) REFERENCES kpi_form(id);

ALTER TABLE kpi_template_cycle_period
    DROP INDEX uk_kpi_cycle_period_number;

ALTER TABLE kpi_template_cycle_period
    ADD CONSTRAINT uk_kpi_cycle_period_number
        UNIQUE (cycle_id, kpi_form_id, period_number);
