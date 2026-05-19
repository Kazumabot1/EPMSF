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
import java.util.Set;

/**
 * Aligns {@code kpi_form} with JPA ({@code created_by} user FK + {@code created_by_string} email).
 * Legacy schemas stored email text in {@code created_by}, which breaks Hibernate integer mapping.
 */
@Slf4j
@Component
@Order(0)
public class KpiFormSchemaFix implements ApplicationRunner {

    private static final Set<String> INTEGER_TYPES = Set.of("int", "integer", "bigint", "smallint", "tinyint", "mediumint");

    private final DataSource dataSource;

    public KpiFormSchemaFix(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) {
        try (Connection conn = dataSource.getConnection()) {
            String product = conn.getMetaData().getDatabaseProductName().toLowerCase(Locale.ROOT);
            if (!product.contains("mysql") && !product.contains("mariadb")) {
                return;
            }
            if (!tableExists(conn, "kpi_form")) {
                return;
            }
            ensureCreatedByStringColumn(conn);
            migrateLegacyCreatedByColumn(conn);
            normalizeFormStatus(conn);
        } catch (SQLException e) {
            log.warn("KPI form schema fix skipped: {}", e.getMessage());
        }
    }

    private void ensureCreatedByStringColumn(Connection conn) throws SQLException {
        if (columnExists(conn, "kpi_form", "created_by_string")) {
            return;
        }
        try (Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("ALTER TABLE kpi_form ADD COLUMN created_by_string VARCHAR(255) NULL");
            log.info("Added kpi_form.created_by_string column.");
        }
    }

    private void migrateLegacyCreatedByColumn(Connection conn) throws SQLException {
        String type = columnDataType(conn, "kpi_form", "created_by");
        if (type == null || INTEGER_TYPES.contains(type)) {
            return;
        }

        log.warn("kpi_form.created_by has type {} (expected integer FK). Migrating to created_by_string.", type);

        try (Statement stmt = conn.createStatement()) {
            if (columnExists(conn, "kpi_form", "created_by_string")) {
                stmt.executeUpdate(
                        "UPDATE kpi_form SET created_by_string = created_by "
                                + "WHERE created_by_string IS NULL AND created_by IS NOT NULL"
                );
            }
            stmt.executeUpdate("ALTER TABLE kpi_form CHANGE COLUMN created_by created_by_legacy VARCHAR(255) NULL");
            stmt.executeUpdate("ALTER TABLE kpi_form ADD COLUMN created_by INT NULL");
            stmt.executeUpdate(
                    "UPDATE kpi_form SET created_by_string = COALESCE(created_by_string, created_by_legacy) "
                            + "WHERE created_by_legacy IS NOT NULL"
            );
            stmt.executeUpdate("ALTER TABLE kpi_form DROP COLUMN created_by_legacy");
            log.info("Migrated kpi_form.created_by to INT FK; preserved emails in created_by_string.");
        } catch (SQLException e) {
            log.error(
                    "Could not migrate kpi_form.created_by. Run manual SQL to add created_by INT NULL and created_by_string.",
                    e
            );
        }
    }

    private void normalizeFormStatus(Connection conn) throws SQLException {
        if (!columnExists(conn, "kpi_form", "status")) {
            return;
        }
        try (Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("UPDATE kpi_form SET status = UPPER(TRIM(status)) WHERE status IS NOT NULL");
            stmt.executeUpdate(
                    "UPDATE kpi_form SET status = 'DRAFT' "
                            + "WHERE status IS NULL OR status NOT IN ('DRAFT','ACTIVE','FINALIZED','SENT','ARCHIVED')"
            );
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
        return columnDataType(conn, tableName, columnName) != null;
    }

    private static String columnDataType(Connection conn, String tableName, String columnName) throws SQLException {
        try (Statement st = conn.createStatement();
                ResultSet rs = st.executeQuery(
                        "SELECT DATA_TYPE FROM information_schema.columns "
                                + "WHERE table_schema = DATABASE() "
                                + "AND table_name = '" + tableName + "' "
                                + "AND column_name = '" + columnName + "'"
                )) {
            if (!rs.next()) {
                return null;
            }
            String type = rs.getString(1);
            return type != null ? type.toLowerCase(Locale.ROOT) : null;
        }
    }
}
