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
 * Keeps legacy self-assessment tables compatible with the current review workflow.
 */
@Slf4j
@Component
@Order(1)
public class SelfAssessmentSchemaFix implements ApplicationRunner {

    private final DataSource dataSource;

    public SelfAssessmentSchemaFix(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) {
        try (Connection conn = dataSource.getConnection()) {
            String product = conn.getMetaData().getDatabaseProductName().toLowerCase(Locale.ROOT);
            if (!product.contains("mysql") && !product.contains("mariadb")) {
                return;
            }
            alignEmployeeAssessmentStatusColumn(conn);
            addEmployeeAssessmentAuditColumns(conn);
            addAssessmentFormCloseNotificationColumn(conn);
            migrateLegacySelfAssessmentStatuses(conn);
        } catch (SQLException e) {
            log.warn("Self-assessment schema fix skipped: {}", e.getMessage());
        }
    }

    private void alignEmployeeAssessmentStatusColumn(Connection conn) throws SQLException {
        if (!tableExists(conn, "employee_assessments") || !columnExists(conn, "employee_assessments", "status")) {
            return;
        }

        String columnType = columnType(conn, "employee_assessments", "status");
        String normalizedType = columnType == null ? "" : columnType.toLowerCase(Locale.ROOT);
        if (normalizedType.contains("varchar") && columnSize(conn, "employee_assessments", "status") >= 40) {
            return;
        }

        try (Statement stmt = conn.createStatement()) {
            stmt.executeUpdate(
                    "ALTER TABLE employee_assessments "
                            + "MODIFY COLUMN status VARCHAR(40) NOT NULL DEFAULT 'DRAFT'"
            );
            log.info("Aligned employee_assessments.status column for self-assessment workflow statuses.");
        }
    }


    private void addEmployeeAssessmentAuditColumns(Connection conn) throws SQLException {
        if (!tableExists(conn, "employee_assessments")) {
            return;
        }

        addColumnIfMissing(conn, "employee_assessments", "rejected_by_role", "VARCHAR(40) NULL");
        addColumnIfMissing(conn, "employee_assessments", "rejected_by_user_id", "INT NULL");
        addColumnIfMissing(conn, "employee_assessments", "rejected_by_name", "VARCHAR(255) NULL");
        addColumnIfMissing(conn, "employee_assessments", "rejected_at", "DATETIME NULL");
        addColumnIfMissing(conn, "employee_assessments", "attempt_no", "INT NULL DEFAULT 1");
        addColumnIfMissing(conn, "employee_assessments", "resubmitted_from_assessment_id", "BIGINT NULL");
        addColumnIfMissing(conn, "employee_assessments", "resubmit_allowed_by_user_id", "INT NULL");
        addColumnIfMissing(conn, "employee_assessments", "resubmit_allowed_by_name", "VARCHAR(255) NULL");
        addColumnIfMissing(conn, "employee_assessments", "resubmit_allowed_at", "DATETIME NULL");
        addColumnIfMissing(conn, "employee_assessments", "resubmit_reason", "TEXT NULL");

        try (Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("UPDATE employee_assessments SET attempt_no = 1 WHERE attempt_no IS NULL OR attempt_no < 1");
        }
    }

    private void addAssessmentFormCloseNotificationColumn(Connection conn) throws SQLException {
        if (!tableExists(conn, "assessment_forms")) {
            return;
        }

        addColumnIfMissing(conn, "assessment_forms", "start_notification_sent_at", "DATETIME NULL");
        addColumnIfMissing(conn, "assessment_forms", "close_notification_sent_at", "DATETIME NULL");
    }

    private void migrateLegacySelfAssessmentStatuses(Connection conn) throws SQLException {
        if (!tableExists(conn, "employee_assessments") || !columnExists(conn, "employee_assessments", "status")) {
            return;
        }

        try (Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("UPDATE employee_assessments SET status = 'PENDING_HR' WHERE status = 'PENDING_DEPARTMENT_HEAD'");
            stmt.executeUpdate("UPDATE employee_assessments SET status = 'REJECTED' WHERE status IN ('DECLINED', 'CLOSED_REJECTED')");
            stmt.executeUpdate("UPDATE employee_assessments SET rejected_at = COALESCE(rejected_at, declined_at), rejected_by_role = COALESCE(rejected_by_role, 'HR') WHERE status = 'REJECTED' AND declined_at IS NOT NULL AND rejected_at IS NULL");
        }
    }

    private void addColumnIfMissing(Connection conn, String tableName, String columnName, String definition) throws SQLException {
        if (columnExists(conn, tableName, columnName)) {
            return;
        }

        try (Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("ALTER TABLE " + tableName + " ADD COLUMN " + columnName + " " + definition);
            log.info("Added {}.{} for self-assessment workflow compatibility.", tableName, columnName);
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

    private int columnSize(Connection conn, String tableName, String columnName) throws SQLException {
        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(
                     "SELECT COALESCE(CHARACTER_MAXIMUM_LENGTH, 0) FROM information_schema.columns "
                             + "WHERE table_schema = DATABASE() "
                             + "AND table_name = '" + tableName + "' "
                             + "AND column_name = '" + columnName + "'"
             )) {
            return rs.next() ? rs.getInt(1) : 0;
        }
    }
}
