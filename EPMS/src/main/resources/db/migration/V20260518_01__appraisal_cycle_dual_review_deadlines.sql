SET @schema_name := DATABASE();

SET @add_manager_deadline_sql := (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE appraisal_cycle ADD COLUMN manager_submission_deadline DATE NULL',
        'SELECT ''appraisal_cycle.manager_submission_deadline already exists'' AS message'
    )
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'appraisal_cycle'
      AND COLUMN_NAME = 'manager_submission_deadline'
);
PREPARE add_manager_deadline_stmt FROM @add_manager_deadline_sql;
EXECUTE add_manager_deadline_stmt;
DEALLOCATE PREPARE add_manager_deadline_stmt;

SET @add_dept_head_deadline_sql := (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE appraisal_cycle ADD COLUMN dept_head_submission_deadline DATE NULL',
        'SELECT ''appraisal_cycle.dept_head_submission_deadline already exists'' AS message'
    )
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'appraisal_cycle'
      AND COLUMN_NAME = 'dept_head_submission_deadline'
);
PREPARE add_dept_head_deadline_stmt FROM @add_dept_head_deadline_sql;
EXECUTE add_dept_head_deadline_stmt;
DEALLOCATE PREPARE add_dept_head_deadline_stmt;

UPDATE appraisal_cycle
SET manager_submission_deadline = COALESCE(manager_submission_deadline, submission_deadline),
    dept_head_submission_deadline = COALESCE(dept_head_submission_deadline, submission_deadline);
