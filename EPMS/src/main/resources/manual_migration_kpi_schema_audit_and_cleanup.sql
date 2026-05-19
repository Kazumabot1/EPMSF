-- KPI template schema audit & cleanup (run manually against database `epms`)
--
-- Use when frontend shows positions as "available" but POST /api/hr/kpi-templates/create returns 409.
-- Typical cause: kpi_positions row exists with status INACTIVE/REMOVED while APIs only listed ACTIVE rows (fixed in app code).

-- =============================================================================
-- 1. DIAGNOSTICS — run and inspect results
-- =============================================================================

-- All KPI-related tables in this schema
SELECT table_name, table_rows
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name LIKE 'kpi%'
ORDER BY table_name;

-- Positions with more than one kpi_positions row (should be empty if uk_kpi_positions_position_id exists)
SELECT position_id, COUNT(*) AS row_count, GROUP_CONCAT(CONCAT('form=', kpi_form_id, ':', status) ORDER BY id) AS links
FROM kpi_positions
GROUP BY position_id
HAVING row_count > 1;

-- Occupancy by status (INACTIVE/REMOVED still block create when position_id is unique)
SELECT status, COUNT(*) AS cnt
FROM kpi_positions
GROUP BY status;

-- Orphan links (no parent kpi_form)
SELECT kp.*
FROM kpi_positions kp
LEFT JOIN kpi_form f ON f.id = kp.kpi_form_id
WHERE f.id IS NULL;

-- Forms without any position link
SELECT f.id, f.title, f.status
FROM kpi_form f
LEFT JOIN kpi_positions kp ON kp.kpi_form_id = f.id
WHERE kp.id IS NULL;

-- Legacy column still present?
SELECT column_name, is_nullable, column_type
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'kpi_positions'
  AND column_name = 'kpi_id';

-- Legacy `kpi` table (pre–kpi_form model)
SELECT COUNT(*) AS legacy_kpi_table_rows
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name = 'kpi';

-- =============================================================================
-- 2. SAFE CLEANUP (review diagnostics first)
-- =============================================================================

-- Orphan position links
DELETE kp
FROM kpi_positions kp
LEFT JOIN kpi_form f ON f.id = kp.kpi_form_id
WHERE f.id IS NULL;

-- Optional: normalize non-ACTIVE statuses to ACTIVE if you intend soft-delete to free a position
-- (Application does not set INACTIVE/REMOVED today; only use if legacy data exists.)
-- UPDATE kpi_positions SET status = 'ACTIVE', removed_at = NULL WHERE status IN ('INACTIVE', 'REMOVED');

-- Optional: drop legacy kpi_id column after backup (see manual_migration_kpi_positions_drop_legacy_kpi_id.sql)
-- ALTER TABLE kpi_positions DROP COLUMN kpi_id;

-- Optional: drop empty legacy table (ONLY if confirmed unused)
-- DROP TABLE IF EXISTS kpi;

-- =============================================================================
-- 3. ENFORCE one form per position (run once if constraint missing)
-- =============================================================================
-- Resolve duplicates from section 1 before running:
-- ALTER TABLE kpi_positions ADD CONSTRAINT uk_kpi_positions_position_id UNIQUE (position_id);
