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
            alignEarlyCloseColumns(conn);
            alignDepartmentKpiEarlyCloseColumns(conn);
            alignCycleDurationColumns(conn);
            alignDepartmentKpiDurationColumns(conn);
            alignCyclePeriodTemplateColumn(conn);
            alignCycleStatusEnum(conn);
            alignDepartmentKpiCycleStatusEnum(conn);
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
        if (columnType != null && columnType.toLowerCase(Locale.ROOT).contains("'pending_approval'")) {
            return;
        }
        try (Statement stmt = conn.createStatement()) {
            stmt.executeUpdate(
                    "ALTER TABLE kpi_template_cycle "
                            + "MODIFY COLUMN status ENUM('DRAFT','ACTIVE','PENDING_APPROVAL','CLOSING','DEACTIVATED') NOT NULL"
            );
            log.info("Aligned kpi_template_cycle.status enum with early close approval status.");
        }
    }

    private void alignEarlyCloseColumns(Connection conn) throws SQLException {
        if (!tableExists(conn, "kpi_template_cycle")) {
            return;
        }
        addColumnIfMissing(conn, "kpi_template_cycle", "early_close_reason", "VARCHAR(1000) NULL");
        addColumnIfMissing(conn, "kpi_template_cycle", "grace_extension", "VARCHAR(30) NULL");
        addColumnIfMissing(conn, "kpi_template_cycle", "early_close_requested_at", "DATETIME(6) NULL");
        addColumnIfMissing(conn, "kpi_template_cycle", "early_close_requested_by", "INT NULL");
        addColumnIfMissing(conn, "kpi_template_cycle", "early_close_reviewed_at", "DATETIME(6) NULL");
        addColumnIfMissing(conn, "kpi_template_cycle", "early_close_reviewed_by", "INT NULL");
        addColumnIfMissing(conn, "kpi_template_cycle", "early_close_review_decision", "VARCHAR(30) NULL");
        addColumnIfMissing(conn, "kpi_template_cycle", "early_close_review_reason", "VARCHAR(1000) NULL");
    }

    private void alignDepartmentKpiEarlyCloseColumns(Connection conn) throws SQLException {
        if (!tableExists(conn, "department_kpi_cycle")) {
            return;
        }
        addColumnIfMissing(conn, "department_kpi_cycle", "closing_requested_at", "DATETIME(6) NULL");
        addColumnIfMissing(conn, "department_kpi_cycle", "grace_ends_at", "DATETIME(6) NULL");
        addColumnIfMissing(conn, "department_kpi_cycle", "closed_at", "DATETIME(6) NULL");
        addColumnIfMissing(conn, "department_kpi_cycle", "early_close_reason", "VARCHAR(1000) NULL");
        addColumnIfMissing(conn, "department_kpi_cycle", "grace_extension", "VARCHAR(30) NULL");
        addColumnIfMissing(conn, "department_kpi_cycle", "early_close_requested_at", "DATETIME(6) NULL");
        addColumnIfMissing(conn, "department_kpi_cycle", "early_close_requested_by", "INT NULL");
        addColumnIfMissing(conn, "department_kpi_cycle", "early_close_reviewed_at", "DATETIME(6) NULL");
        addColumnIfMissing(conn, "department_kpi_cycle", "early_close_reviewed_by", "INT NULL");
        addColumnIfMissing(conn, "department_kpi_cycle", "early_close_review_decision", "VARCHAR(30) NULL");
        addColumnIfMissing(conn, "department_kpi_cycle", "early_close_review_reason", "VARCHAR(1000) NULL");
    }

    private void alignCycleDurationColumns(Connection conn) throws SQLException {
        if (!tableExists(conn, "kpi_template_cycle")) {
            return;
        }
        if (!columnExists(conn, "kpi_template_cycle", "duration_years")) {
            try (Statement stmt = conn.createStatement()) {
                stmt.executeUpdate("ALTER TABLE kpi_template_cycle ADD COLUMN duration_years INT NOT NULL DEFAULT 1");
                stmt.executeUpdate(
                        "UPDATE kpi_template_cycle "
                                + "SET duration_years = GREATEST(1, LEAST(5, CEIL(COALESCE(duration_months, 12) / 12)))"
                );
                log.info("Added kpi_template_cycle.duration_years column.");
            }
        }
    }

    private void alignDepartmentKpiDurationColumns(Connection conn) throws SQLException {
        if (tableExists(conn, "department_kpi_template")
                && !columnExists(conn, "department_kpi_template", "duration_months")) {
            try (Statement stmt = conn.createStatement()) {
                stmt.executeUpdate("ALTER TABLE department_kpi_template ADD COLUMN duration_months INT NOT NULL DEFAULT 3");
                log.info("Added department_kpi_template.duration_months column.");
            }
        }
        if (tableExists(conn, "department_kpi_cycle")
                && !columnExists(conn, "department_kpi_cycle", "duration_years")) {
            try (Statement stmt = conn.createStatement()) {
                stmt.executeUpdate("ALTER TABLE department_kpi_cycle ADD COLUMN duration_years INT NOT NULL DEFAULT 1");
                stmt.executeUpdate(
                        "UPDATE department_kpi_cycle "
                                + "SET duration_years = GREATEST(1, LEAST(5, CEIL(COALESCE(duration_months, 12) / 12)))"
                );
                log.info("Added department_kpi_cycle.duration_years column.");
            }
        }
    }

    private void alignCyclePeriodTemplateColumn(Connection conn) throws SQLException {
        if (!tableExists(conn, "kpi_template_cycle_period")) {
            return;
        }
        if (!columnExists(conn, "kpi_template_cycle_period", "kpi_form_id")) {
            try (Statement stmt = conn.createStatement()) {
                stmt.executeUpdate("ALTER TABLE kpi_template_cycle_period ADD COLUMN kpi_form_id INT NULL");
                log.info("Added kpi_template_cycle_period.kpi_form_id column.");
            }
        }
    }

    private void alignDepartmentKpiCycleStatusEnum(Connection conn) throws SQLException {
        if (!tableExists(conn, "department_kpi_cycle") || !columnExists(conn, "department_kpi_cycle", "status")) {
            return;
        }
        String columnType = columnType(conn, "department_kpi_cycle", "status");
        if (columnType == null || !columnType.toLowerCase(Locale.ROOT).contains("enum")) {
            return;
        }
        if (columnType.toLowerCase(Locale.ROOT).contains("'pending_approval'")) {
            return;
        }
        try (Statement stmt = conn.createStatement()) {
            stmt.executeUpdate(
                    "ALTER TABLE department_kpi_cycle "
                            + "MODIFY COLUMN status ENUM('DRAFT','ACTIVE','PENDING_APPROVAL','CLOSING','DEACTIVATED') NOT NULL"
            );
            log.info("Aligned department_kpi_cycle.status enum with early close approval status.");
        }
    }

    private void addColumnIfMissing(Connection conn, String tableName, String columnName, String definition) throws SQLException {
        if (columnExists(conn, tableName, columnName)) {
            return;
        }
        try (Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("ALTER TABLE " + tableName + " ADD COLUMN " + columnName + " " + definition);
            log.info("Added {}.{} column.", tableName, columnName);
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
