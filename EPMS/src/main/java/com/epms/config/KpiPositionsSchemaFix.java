package com.epms.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Locale;

/**
 * Aligns {@code kpi_positions} with the JPA entity (status, assigned_at, legacy {@code kpi_id}).
 * Prevents HTTP 500 on GET /api/hr/kpi-templates/list when older MySQL schemas are missing columns.
 */
@Slf4j
@Component
@Order(1)
public class KpiPositionsSchemaFix implements ApplicationRunner {

    private final DataSource dataSource;

    public KpiPositionsSchemaFix(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) {
        try (Connection conn = dataSource.getConnection()) {
            String product = conn.getMetaData().getDatabaseProductName().toLowerCase(Locale.ROOT);
            if (!product.contains("mysql") && !product.contains("mariadb")) {
                return;
            }
            if (!tableExists(conn, "kpi_positions")) {
                log.debug("kpi_positions table not present yet; Hibernate ddl-auto will create it.");
                return;
            }
            relaxLegacyKpiIdColumn(conn);
            ensureStatusColumn(conn);
            ensureAssignedAtColumn(conn);
            ensureOptionalLinkColumns(conn);
            normalizeStatusValues(conn);
        } catch (SQLException e) {
            log.warn("KPI positions schema fix skipped: {}", e.getMessage());
        }
    }

    private void relaxLegacyKpiIdColumn(Connection conn) throws SQLException {
        if (!columnExists(conn, "kpi_positions", "kpi_id")) {
            return;
        }
        try (Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("ALTER TABLE kpi_positions MODIFY COLUMN kpi_id INT NULL");
            log.info("kpi_positions.kpi_id set nullable (legacy column unused by JPA).");
        } catch (SQLException first) {
            log.warn("Could not MODIFY kpi_positions.kpi_id to NULL: {} — attempting DROP COLUMN", first.getMessage());
            try (Statement stmt = conn.createStatement()) {
                stmt.executeUpdate("ALTER TABLE kpi_positions DROP COLUMN kpi_id");
                log.info("Dropped legacy column kpi_positions.kpi_id.");
            } catch (SQLException second) {
                log.error(
                        "Automatic fix for kpi_positions.kpi_id failed. Run manual_migration_kpi_positions_drop_legacy_kpi_id.sql",
                        second
                );
            }
        }
    }

    private void ensureStatusColumn(Connection conn) throws SQLException {
        if (columnExists(conn, "kpi_positions", "status")) {
            return;
        }
        try (Statement stmt = conn.createStatement()) {
            stmt.executeUpdate(
                    "ALTER TABLE kpi_positions ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'"
            );
            log.info("Added kpi_positions.status column (default ACTIVE).");
        }
    }

    private void ensureAssignedAtColumn(Connection conn) throws SQLException {
        if (columnExists(conn, "kpi_positions", "assigned_at")) {
            return;
        }
        try (Statement stmt = conn.createStatement()) {
            stmt.executeUpdate(
                    "ALTER TABLE kpi_positions ADD COLUMN assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
            );
            log.info("Added kpi_positions.assigned_at column.");
        }
    }

    private void ensureOptionalLinkColumns(Connection conn) throws SQLException {
        if (!columnExists(conn, "kpi_positions", "assigned_by")) {
            try (Statement stmt = conn.createStatement()) {
                stmt.executeUpdate("ALTER TABLE kpi_positions ADD COLUMN assigned_by INT NULL");
                log.info("Added kpi_positions.assigned_by column.");
            }
        }
        if (!columnExists(conn, "kpi_positions", "assigned_by_string")) {
            try (Statement stmt = conn.createStatement()) {
                stmt.executeUpdate("ALTER TABLE kpi_positions ADD COLUMN assigned_by_string VARCHAR(255) NULL");
                log.info("Added kpi_positions.assigned_by_string column.");
            }
        }
        if (!columnExists(conn, "kpi_positions", "removed_at")) {
            try (Statement stmt = conn.createStatement()) {
                stmt.executeUpdate("ALTER TABLE kpi_positions ADD COLUMN removed_at DATETIME NULL");
                log.info("Added kpi_positions.removed_at column.");
            }
        }
    }

    private void normalizeStatusValues(Connection conn) throws SQLException {
        if (!columnExists(conn, "kpi_positions", "status")) {
            return;
        }
        try (Statement stmt = conn.createStatement()) {
            int updated = stmt.executeUpdate(
                    "UPDATE kpi_positions SET status = 'ACTIVE' "
                            + "WHERE status IS NULL OR TRIM(status) = '' "
                            + "OR status NOT IN ('ACTIVE', 'INACTIVE', 'REMOVED')"
            );
            if (updated > 0) {
                log.info("Normalized {} kpi_positions row(s) to status ACTIVE.", updated);
            }
        }
    }

    private static boolean tableExists(Connection conn, String tableName) throws SQLException {
        try (Statement st = conn.createStatement();
                ResultSet rs = st.executeQuery(
                        "SELECT COUNT(*) FROM information_schema.tables "
                                + "WHERE table_schema = DATABASE() AND table_name = '" + tableName + "'"
                )) {
            return rs.next() && rs.getLong(1) > 0;
        }
    }

    private static boolean columnExists(Connection conn, String tableName, String columnName) throws SQLException {
        try (Statement st = conn.createStatement();
                ResultSet rs = st.executeQuery(
                        "SELECT COUNT(*) FROM information_schema.columns "
                                + "WHERE table_schema = DATABASE() "
                                + "AND table_name = '" + tableName + "' "
                                + "AND column_name = '" + columnName + "'"
                )) {
            return rs.next() && rs.getLong(1) > 0;
        }
    }
}
