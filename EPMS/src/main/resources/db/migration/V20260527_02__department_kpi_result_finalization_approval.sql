ALTER TABLE department_kpi_result
  ADD COLUMN IF NOT EXISTS finalization_request_reason VARCHAR(1000) NULL;

ALTER TABLE department_kpi_result
  ADD COLUMN IF NOT EXISTS finalization_requested_at DATETIME NULL;

ALTER TABLE department_kpi_result
  ADD COLUMN IF NOT EXISTS finalization_requested_by_user_id INT NULL;

ALTER TABLE department_kpi_result
  ADD COLUMN IF NOT EXISTS finalization_review_decision VARCHAR(30) NULL;

ALTER TABLE department_kpi_result
  ADD COLUMN IF NOT EXISTS finalization_review_reason VARCHAR(1000) NULL;

ALTER TABLE department_kpi_result
  ADD COLUMN IF NOT EXISTS finalization_reviewed_at DATETIME NULL;

ALTER TABLE department_kpi_result
  ADD COLUMN IF NOT EXISTS finalization_reviewed_by_user_id INT NULL;

ALTER TABLE department_kpi_result
  MODIFY COLUMN status ENUM('ASSIGNED','IN_PROGRESS','PENDING_APPROVAL','FINALIZED','CLOSED') NOT NULL;

ALTER TABLE department_kpi_result
  ADD CONSTRAINT fk_dept_kpi_result_finalization_requested_by
  FOREIGN KEY (finalization_requested_by_user_id) REFERENCES users(id);

ALTER TABLE department_kpi_result
  ADD CONSTRAINT fk_dept_kpi_result_finalization_reviewed_by
  FOREIGN KEY (finalization_reviewed_by_user_id) REFERENCES users(id);
