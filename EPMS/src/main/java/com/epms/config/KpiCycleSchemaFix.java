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
 * Aligns legacy MySQL enum columns with the KPI cycle grace-flow statuses.
 */
@Slf4j
@Component
@Order(1)
public class KpiCycleSchemaFix implements ApplicationRunner {

    private final DataSource dataSource;

    public KpiCycleSchemaFix(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) {
        try (Connection conn = dataSource.getConnection()) {
            String product = conn.getMetaData().getDatabaseProductName().toLowerCase(Locale.ROOT);
            if (!product.contains("mysql") && !product.contains("mariadb")) {
                return;
            }
            alignCycleStatusEnum(conn);
            alignEmployeeKpiStatusEnum(conn);
        } catch (SQLException e) {
            log.warn("KPI cycle schema fix skipped: {}", e.getMessage());
        }
    }

    private void alignCycleStatusEnum(Connection conn) throws SQLException {
        if (!tableExists(conn, "kpi_template_cycle") || !columnExists(conn, "kpi_template_cycle", "status")) {
            return;
        }
        String columnType = columnType(conn, "kpi_template_cycle", "status");
        if (columnType != null && columnType.toLowerCase(Locale.ROOT).contains("'closing'")) {
            return;
        }
        try (Statement stmt = conn.createStatement()) {
            stmt.executeUpdate(
                    "ALTER TABLE kpi_template_cycle "
                            + "MODIFY COLUMN status ENUM('DRAFT','ACTIVE','CLOSING','DEACTIVATED') NOT NULL"
            );
            log.info("Aligned kpi_template_cycle.status enum with CLOSING status.");
        }
    }

    private void alignEmployeeKpiStatusEnum(Connection conn) throws SQLException {
        if (!tableExists(conn, "employee_kpi_forms") || !columnExists(conn, "employee_kpi_forms", "status")) {
            return;
        }
        String columnType = columnType(conn, "employee_kpi_forms", "status");
        if (columnType != null && columnType.toLowerCase(Locale.ROOT).contains("'closed'")) {
            return;
        }
        try (Statement stmt = conn.createStatement()) {
            stmt.executeUpdate(
                    "ALTER TABLE employee_kpi_forms "
                            + "MODIFY COLUMN status ENUM('ASSIGNED','IN_PROGRESS','FINALIZED','CLOSED','SENT_TO_EMPLOYEE','ACKNOWLEDGED') NOT NULL"
            );
            log.info("Aligned employee_kpi_forms.status enum with CLOSED status.");
        }
    }

    private boolean tableExists(Connection conn, String tableName) throws SQLException {
        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(
                     "SELECT COUNT(*) FROM information_schema.tables "
                             + "WHERE table_schema = DATABASE() AND table_name = '" + tableName + "'"
             )) {
            return rs.next() && rs.getInt(1) > 0;
        }
    }

    private boolean columnExists(Connection conn, String tableName, String columnName) throws SQLException {
        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(
                     "SELECT COUNT(*) FROM information_schema.columns "
                             + "WHERE table_schema = DATABASE() "
                             + "AND table_name = '" + tableName + "' "
                             + "AND column_name = '" + columnName + "'"
             )) {
            return rs.next() && rs.getInt(1) > 0;
        }
    }

    private String columnType(Connection conn, String tableName, String columnName) throws SQLException {
        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(
                     "SELECT COLUMN_TYPE FROM information_schema.columns "
                             + "WHERE table_schema = DATABASE() "
                             + "AND table_name = '" + tableName + "' "
                             + "AND column_name = '" + columnName + "'"
             )) {
            return rs.next() ? rs.getString(1) : null;
        }
    }
}
