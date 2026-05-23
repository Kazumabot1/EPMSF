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
 * Aligns kpi_form_items with the custom category/unit label flow.
 * Existing MySQL schemas may still have kpi_category_id/kpi_unit_id as NOT NULL.
 */
@Slf4j
@Component
@Order(2)
public class KpiFormItemsSchemaFix implements ApplicationRunner {

    private final DataSource dataSource;

    public KpiFormItemsSchemaFix(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) {
        try (Connection conn = dataSource.getConnection()) {
            String product = conn.getMetaData().getDatabaseProductName().toLowerCase(Locale.ROOT);
            if (!product.contains("mysql") && !product.contains("mariadb")) {
                return;
            }
            if (!tableExists(conn, "kpi_form_items")) {
                return;
            }
            ensureLabelColumn(conn, "kpi_category_label");
            ensureLabelColumn(conn, "kpi_unit_label");
            ensureNullableIntColumn(conn, "kpi_category_id");
            ensureNullableIntColumn(conn, "kpi_unit_id");
        } catch (SQLException e) {
            log.warn("KPI form items schema fix skipped: {}", e.getMessage());
        }
    }

    private void ensureLabelColumn(Connection conn, String columnName) throws SQLException {
        if (columnExists(conn, "kpi_form_items", columnName)) {
            return;
        }
        try (Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("ALTER TABLE kpi_form_items ADD COLUMN " + columnName + " VARCHAR(100) NULL");
            log.info("Added kpi_form_items.{} column.", columnName);
        }
    }

    private void ensureNullableIntColumn(Connection conn, String columnName) throws SQLException {
        if (!"NO".equalsIgnoreCase(columnNullable(conn, "kpi_form_items", columnName))) {
            return;
        }
        try (Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("ALTER TABLE kpi_form_items MODIFY COLUMN " + columnName + " INT NULL");
            log.info("Relaxed kpi_form_items.{} to nullable for custom KPI labels.", columnName);
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
        return columnNullable(conn, tableName, columnName) != null;
    }

    private static String columnNullable(Connection conn, String tableName, String columnName) throws SQLException {
        try (Statement st = conn.createStatement();
                ResultSet rs = st.executeQuery(
                        "SELECT IS_NULLABLE FROM information_schema.columns "
                                + "WHERE table_schema = DATABASE() "
                                + "AND table_name = '" + tableName + "' "
                                + "AND column_name = '" + columnName + "'"
                )) {
            if (!rs.next()) {
                return null;
            }
            return rs.getString(1);
        }
    }
}
