-- Enforce one KPI form per position (unique position_id on kpi_positions).
--
-- Resolve duplicate assignments before running, e.g.:
--   SELECT position_id, COUNT(*) AS c FROM kpi_positions GROUP BY position_id HAVING c > 1;
--
-- Run ONCE against your MySQL database:
--   mysql -u root -p epms < manual_migration_kpi_positions_unique_position_id.sql

ALTER TABLE kpi_positions
    ADD CONSTRAINT uk_kpi_positions_position_id UNIQUE (position_id);
