-- Optional manual migration when Hibernate ddl-auto does not alter NOT NULL constraints.
ALTER TABLE kpi_form MODIFY COLUMN start_date DATE NULL;
ALTER TABLE kpi_form MODIFY COLUMN end_date DATE NULL;
