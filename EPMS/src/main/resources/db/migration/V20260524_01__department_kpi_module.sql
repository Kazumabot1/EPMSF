CREATE TABLE IF NOT EXISTS department_kpi_template (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  created_by INT NULL,
  created_at DATETIME NULL,
  updated_by INT NULL,
  updated_at DATETIME NULL,
  CONSTRAINT fk_dept_kpi_template_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_dept_kpi_template_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS department_kpi_template_row (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_id INT NOT NULL,
  kpi_category_id INT NULL,
  kpi_category_label VARCHAR(100) NULL,
  kpi_item_id INT NULL,
  kpi_label VARCHAR(500) NULL,
  kpi_unit_id INT NULL,
  kpi_unit_label VARCHAR(100) NULL,
  target DOUBLE NOT NULL,
  weight INT NOT NULL,
  sort_order INT NULL,
  CONSTRAINT fk_dept_kpi_row_template FOREIGN KEY (template_id) REFERENCES department_kpi_template(id) ON DELETE CASCADE,
  CONSTRAINT fk_dept_kpi_row_category FOREIGN KEY (kpi_category_id) REFERENCES kpi_category(id),
  CONSTRAINT fk_dept_kpi_row_item FOREIGN KEY (kpi_item_id) REFERENCES kpi_items(id),
  CONSTRAINT fk_dept_kpi_row_unit FOREIGN KEY (kpi_unit_id) REFERENCES kpi_unit(id)
);

CREATE TABLE IF NOT EXISTS department_kpi_template_department (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_id INT NOT NULL,
  department_id INT NOT NULL,
  CONSTRAINT uk_department_kpi_template_department UNIQUE (template_id, department_id),
  CONSTRAINT fk_dept_kpi_template_department_template FOREIGN KEY (template_id) REFERENCES department_kpi_template(id) ON DELETE CASCADE,
  CONSTRAINT fk_dept_kpi_template_department_department FOREIGN KEY (department_id) REFERENCES department(id)
);

CREATE TABLE IF NOT EXISTS department_kpi_cycle (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cycle_name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_months INT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  created_by INT NULL,
  created_at DATETIME NULL,
  updated_by INT NULL,
  updated_at DATETIME NULL,
  CONSTRAINT fk_dept_kpi_cycle_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_dept_kpi_cycle_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS department_kpi_cycle_template (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cycle_id INT NOT NULL,
  template_id INT NOT NULL,
  CONSTRAINT uk_department_kpi_cycle_template UNIQUE (cycle_id, template_id),
  CONSTRAINT fk_dept_kpi_cycle_template_cycle FOREIGN KEY (cycle_id) REFERENCES department_kpi_cycle(id) ON DELETE CASCADE,
  CONSTRAINT fk_dept_kpi_cycle_template_template FOREIGN KEY (template_id) REFERENCES department_kpi_template(id)
);

CREATE TABLE IF NOT EXISTS department_kpi_cycle_period (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cycle_id INT NOT NULL,
  period_number INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
  CONSTRAINT uk_department_kpi_cycle_period_number UNIQUE (cycle_id, period_number),
  CONSTRAINT fk_dept_kpi_cycle_period_cycle FOREIGN KEY (cycle_id) REFERENCES department_kpi_cycle(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS department_kpi_result (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department_id INT NOT NULL,
  template_id INT NOT NULL,
  cycle_id INT NULL,
  cycle_period_id INT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED',
  assigned_at DATETIME NOT NULL,
  total_score DOUBLE NULL,
  total_weighted_score DOUBLE NULL,
  finalized_at DATETIME NULL,
  finalized_by_user_id INT NULL,
  CONSTRAINT uk_department_kpi_result_scope UNIQUE (department_id, template_id, cycle_period_id),
  CONSTRAINT fk_dept_kpi_result_department FOREIGN KEY (department_id) REFERENCES department(id),
  CONSTRAINT fk_dept_kpi_result_template FOREIGN KEY (template_id) REFERENCES department_kpi_template(id),
  CONSTRAINT fk_dept_kpi_result_cycle FOREIGN KEY (cycle_id) REFERENCES department_kpi_cycle(id),
  CONSTRAINT fk_dept_kpi_result_period FOREIGN KEY (cycle_period_id) REFERENCES department_kpi_cycle_period(id),
  CONSTRAINT fk_dept_kpi_result_finalized_by FOREIGN KEY (finalized_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS department_kpi_score (
  id INT AUTO_INCREMENT PRIMARY KEY,
  result_id INT NOT NULL,
  template_row_id INT NOT NULL,
  actual_value DOUBLE NULL,
  score DOUBLE NULL,
  weighted_score DOUBLE NULL,
  evaluated_by INT NULL,
  evaluated_at DATETIME NULL,
  CONSTRAINT fk_dept_kpi_score_result FOREIGN KEY (result_id) REFERENCES department_kpi_result(id) ON DELETE CASCADE,
  CONSTRAINT fk_dept_kpi_score_row FOREIGN KEY (template_row_id) REFERENCES department_kpi_template_row(id),
  CONSTRAINT fk_dept_kpi_score_evaluator FOREIGN KEY (evaluated_by) REFERENCES users(id)
);
