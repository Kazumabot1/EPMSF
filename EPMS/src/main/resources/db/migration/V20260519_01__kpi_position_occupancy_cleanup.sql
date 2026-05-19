-- KPI template schema: align occupancy with uk_kpi_positions_position_id (one row per position, any status).
--
-- Source of truth for "KPI template":
--   kpi_form              — template header + status
--   kpi_positions         — which position owns which form (unique position_id)
--   kpi_form_items        — KPI rows / weights
--
-- NOT duplicates of kpi_form (separate features):
--   kpi_template_cycle      — appraisal cycle window
--   kpi_template_cycle_form — forms included in a cycle (cycle_id + kpi_form_id)
--
-- Legacy (unused by JPA): table `kpi`, column kpi_positions.kpi_id — see manual_migration_kpi_positions_drop_legacy_kpi_id.sql

-- Remove links whose parent form was deleted outside JPA cascade.
DELETE kp
FROM kpi_positions kp
LEFT JOIN kpi_form f ON f.id = kp.kpi_form_id
WHERE f.id IS NULL;
