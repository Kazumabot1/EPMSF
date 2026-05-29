-- Fix legacy Department KPI template tables where duration_months was left NOT NULL.
-- Current Department KPI templates do not write this column; KPI cycle duration is stored elsewhere.
ALTER TABLE department_kpi_template
  MODIFY COLUMN duration_months INT NULL;
