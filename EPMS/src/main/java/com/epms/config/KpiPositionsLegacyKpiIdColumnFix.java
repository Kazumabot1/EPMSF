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
 * Older MySQL schemas stored {@code kpi_positions.kpi_id} (legacy {@code kpi} table).
 * JPA now maps only {@code kpi_form_id}. Hibernate omits {@code kpi_id}, so NOT NULL
 * without default fails inserts. relax or drop the obsolete column automatically.
 */
@Slf4j
@Component
@Order(1)
public class KpiPositionsLegacyKpiIdColumnFix implements ApplicationRunner {

    private final DataSource dataSource;

    public KpiPositionsLegacyKpiIdColumnFix(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) {
        try (Connection conn = dataSource.getConnection()) {
            String product = conn.getMetaData().getDatabaseProductName().toLowerCase(Locale.ROOT);
            if (!product.contains("mysql") && !product.contains("mariadb")) {
                return;
            }
            if (!legacyKpiIdColumnPresent(conn)) {
                return;
            }
            try (Statement stmt = conn.createStatement()) {
                stmt.executeUpdate("ALTER TABLE kpi_positions MODIFY COLUMN kpi_id INT NULL");
                log.info("kpi_positions.kpi_id set nullable (legacy column unused by JPA). KPI template save should work.");
            } catch (SQLException first) {
                log.warn("Could not MODIFY kpi_positions.kpi_id to NULL: {} — attempting DROP COLUMN", first.getMessage());
                try (Statement stmt = conn.createStatement()) {
                    stmt.executeUpdate("ALTER TABLE kpi_positions DROP COLUMN kpi_id");
                    log.info("Dropped legacy column kpi_positions.kpi_id.");
                } catch (SQLException second) {
                    log.error(
                            "Automatic fix for kpi_positions.kpi_id failed. Run the SQL in manual_migration_kpi_positions_drop_legacy_kpi_id.sql",
                            second);
                }
            }
        } catch (SQLException e) {
            log.warn("Skipping kpi_positions legacy column migration: {}", e.getMessage());
        }
    }

    private static boolean legacyKpiIdColumnPresent(Connection conn) throws SQLException {
        try (Statement st = conn.createStatement();
                ResultSet rs = st.executeQuery(
                        "SELECT COUNT(*) FROM information_schema.columns "
                                + "WHERE table_schema = DATABASE() AND table_name = 'kpi_positions' AND column_name = 'kpi_id'")) {
            return rs.next() && rs.getLong(1) > 0;
        }
    }
}
