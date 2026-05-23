CREATE TABLE IF NOT EXISTS kpi_template_cycle_period (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cycle_id INT NOT NULL,
    period_number INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    closing_requested_at DATETIME(6) NULL,
    grace_ends_at DATETIME(6) NULL,
    closed_at DATETIME(6) NULL,
    CONSTRAINT uk_kpi_cycle_period_number UNIQUE (cycle_id, period_number),
    CONSTRAINT fk_kpi_cycle_period_cycle FOREIGN KEY (cycle_id) REFERENCES kpi_template_cycle(id)
);

ALTER TABLE kpi_template_cycle
    ADD COLUMN closing_requested_at DATETIME(6) NULL,
    ADD COLUMN grace_ends_at DATETIME(6) NULL,
    ADD COLUMN closed_at DATETIME(6) NULL;

ALTER TABLE employee_kpi_forms
    ADD COLUMN cycle_period_id INT NULL,
    ADD COLUMN position_id_at_assignment INT NULL,
    ADD COLUMN position_title_at_assignment VARCHAR(255) NULL,
    ADD COLUMN grace_reason VARCHAR(40) NULL,
    ADD COLUMN grace_ends_at DATETIME(6) NULL,
    ADD COLUMN closed_at DATETIME(6) NULL;

ALTER TABLE employee_kpi_forms
    ADD CONSTRAINT fk_employee_kpi_forms_cycle_period
        FOREIGN KEY (cycle_period_id) REFERENCES kpi_template_cycle_period(id);

CREATE TABLE IF NOT EXISTS employee_kpi_form_evaluators (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_kpi_form_id INT NOT NULL,
    evaluator_user_id INT NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT uk_employee_kpi_form_evaluator UNIQUE (employee_kpi_form_id, evaluator_user_id),
    CONSTRAINT fk_employee_kpi_form_eval_form FOREIGN KEY (employee_kpi_form_id) REFERENCES employee_kpi_forms(id),
    CONSTRAINT fk_employee_kpi_form_eval_user FOREIGN KEY (evaluator_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS employee_kpi_position_transitions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    old_position_id INT NULL,
    new_position_id INT NULL,
    old_employee_kpi_form_id INT NULL,
    requested_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    grace_ends_at DATETIME(6) NOT NULL,
    completed_at DATETIME(6) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    CONSTRAINT fk_employee_kpi_transition_employee FOREIGN KEY (employee_id) REFERENCES employee(id),
    CONSTRAINT fk_employee_kpi_transition_old_position FOREIGN KEY (old_position_id) REFERENCES positions(id),
    CONSTRAINT fk_employee_kpi_transition_new_position FOREIGN KEY (new_position_id) REFERENCES positions(id),
    CONSTRAINT fk_employee_kpi_transition_old_form FOREIGN KEY (old_employee_kpi_form_id) REFERENCES employee_kpi_forms(id)
);
