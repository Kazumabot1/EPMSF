-- Keep a single time column named `timestamp` (matches the JPA entity mapping).
-- Handles databases where Hibernate added `created_at` or Flyway renamed the column.

SET @has_timestamp := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'audit_logs'
      AND COLUMN_NAME = 'timestamp'
);

SET @has_created_at := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'audit_logs'
      AND COLUMN_NAME = 'created_at'
);

SET @ddl := IF(
    @has_created_at > 0 AND @has_timestamp = 0,
    'ALTER TABLE audit_logs RENAME COLUMN created_at TO `timestamp`',
    'SELECT ''audit_logs.timestamp already present'' AS message'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_timestamp := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'audit_logs'
      AND COLUMN_NAME = 'timestamp'
);

SET @has_created_at := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'audit_logs'
      AND COLUMN_NAME = 'created_at'
);

SET @ddl := IF(
    @has_created_at > 0 AND @has_timestamp > 0,
    'UPDATE audit_logs SET `timestamp` = COALESCE(`timestamp`, created_at) WHERE `timestamp` IS NULL AND created_at IS NOT NULL',
    'SELECT ''no audit_logs timestamp backfill needed'' AS message'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_created_at := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'audit_logs'
      AND COLUMN_NAME = 'created_at'
);

SET @has_timestamp := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'audit_logs'
      AND COLUMN_NAME = 'timestamp'
);

SET @ddl := IF(
    @has_created_at > 0 AND @has_timestamp > 0,
    'ALTER TABLE audit_logs DROP COLUMN created_at',
    'SELECT ''no duplicate audit_logs time column to drop'' AS message'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
