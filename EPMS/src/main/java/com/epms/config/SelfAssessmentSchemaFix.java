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
