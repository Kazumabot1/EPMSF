-- Align kpi_positions with JPA entity (status, assigned_at). Safe to re-run on MySQL 8+.
-- Fixes HTTP 500 on GET /api/hr/kpi-templates/* when legacy schemas omit these columns.

SET @db := DATABASE();

SET @has_status := (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'kpi_positions' AND column_name = 'status'
);
SET @sql_status := IF(
    @has_status = 0,
    'ALTER TABLE kpi_positions ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT ''ACTIVE''',
    'SELECT 1'
);
PREPARE stmt_status FROM @sql_status;
EXECUTE stmt_status;
DEALLOCATE PREPARE stmt_status;

SET @has_assigned_at := (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'kpi_positions' AND column_name = 'assigned_at'
);
SET @sql_assigned_at := IF(
    @has_assigned_at = 0,
    'ALTER TABLE kpi_positions ADD COLUMN assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
    'SELECT 1'
);
PREPARE stmt_assigned_at FROM @sql_assigned_at;
EXECUTE stmt_assigned_at;
DEALLOCATE PREPARE stmt_assigned_at;

UPDATE kpi_positions
SET status = 'ACTIVE'
WHERE status IS NULL
   OR TRIM(status) = ''
   OR status NOT IN ('ACTIVE', 'INACTIVE', 'REMOVED');
