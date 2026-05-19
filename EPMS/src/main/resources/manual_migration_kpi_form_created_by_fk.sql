-- Fix HTTP 500 on GET /api/hr/kpi-templates/* when kpi_form.created_by stores email text instead of users.id
--
-- Run once: mysql -u root -p epms < manual_migration_kpi_form_created_by_fk.sql

ALTER TABLE kpi_form ADD COLUMN IF NOT EXISTS created_by_string VARCHAR(255) NULL;

-- If created_by is not an integer column, migrate (inspect with SHOW COLUMNS FROM kpi_form):
-- UPDATE kpi_form SET created_by_string = created_by WHERE created_by_string IS NULL AND created_by IS NOT NULL;
-- ALTER TABLE kpi_form CHANGE COLUMN created_by created_by_legacy VARCHAR(255) NULL;
-- ALTER TABLE kpi_form ADD COLUMN created_by INT NULL;
-- UPDATE kpi_form SET created_by_string = COALESCE(created_by_string, created_by_legacy);
-- ALTER TABLE kpi_form DROP COLUMN created_by_legacy;

UPDATE kpi_form SET status = UPPER(TRIM(status)) WHERE status IS NOT NULL;
UPDATE kpi_form SET status = 'DRAFT'
WHERE status IS NULL OR status NOT IN ('DRAFT', 'ACTIVE', 'FINALIZED', 'SENT', 'ARCHIVED');
