-- Fix: Field 'kpi_id' doesn't have a default value (insert into kpi_positions)
--
-- The JPA entity `KpiPosition` links KPI templates via `kpi_form_id` only.
-- Older schemas kept a NOT NULL `kpi_id` column (legacy `kpi` table). Hibernate does not
-- populate it, so INSERT fails under strict SQL mode.
--
-- Run ONCE against your MySQL database (e.g. `epms`):
--
--   mysql -u root -p epms < manual_migration_kpi_positions_drop_legacy_kpi_id.sql
--
-- If DROP COLUMN fails due to a foreign key, inspect constraints first:
--   SHOW CREATE TABLE kpi_positions;

-- Preferred: remove the obsolete column entirely.
ALTER TABLE kpi_positions DROP COLUMN kpi_id;

-- Alternative (only if you cannot drop yet): allow NULL so INSERTs without kpi_id succeed.
-- ALTER TABLE kpi_positions MODIFY COLUMN kpi_id INT NULL;
