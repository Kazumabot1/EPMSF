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
 * Keeps legacy feedback 360 campaign tables aligned with the current campaign workflow.
 *
 * Hibernate ddl-auto=update does not reliably expand MySQL ENUM columns when a Java enum
 * gains a new value. The evaluator workflow now writes AUTO_RANKED for ranked peer
 * suggestions, so the database column must not be locked to the older enum definition.
 */
@Slf4j
@Component
@Order(1)
public class Feedback360SchemaFix implements ApplicationRunner {

    private final DataSource dataSource;

    public Feedback360SchemaFix(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) {
        try (Connection conn = dataSource.getConnection()) {
            String product = conn.getMetaData().getDatabaseProductName().toLowerCase(Locale.ROOT);
            if (!product.contains("mysql") && !product.contains("mariadb")) {
                return;
            }
            alignEvaluatorSelectionMethodColumn(conn);
        } catch (SQLException e) {
            log.warn("Feedback 360 schema fix skipped: {}", e.getMessage());
        }
    }

    private void alignEvaluatorSelectionMethodColumn(Connection conn) throws SQLException {
        if (!tableExists(conn, "feedback_evaluator_assignments")
                || !columnExists(conn, "feedback_evaluator_assignments", "selection_method")) {
            return;
        }

        String columnType = columnType(conn, "feedback_evaluator_assignments", "selection_method");
        String normalizedType = columnType == null ? "" : columnType.toLowerCase(Locale.ROOT);
        if (normalizedType.contains("varchar") && columnSize(conn, "feedback_evaluator_assignments", "selection_method") >= 40) {
            return;
        }

        try (Statement stmt = conn.createStatement()) {
            stmt.executeUpdate(
                    "ALTER TABLE feedback_evaluator_assignments "
                            + "MODIFY COLUMN selection_method VARCHAR(40) NOT NULL"
            );
            log.info("Aligned feedback_evaluator_assignments.selection_method for ranked evaluator selection.");
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
