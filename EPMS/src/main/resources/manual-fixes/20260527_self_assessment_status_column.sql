-- Fix legacy employee_assessments.status ENUM/short VARCHAR so the current
-- self-assessment workflow can store PENDING_MANAGER, PENDING_DEPARTMENT_HEAD,
-- PENDING_HR, DECLINED, and CLOSED_REJECTED without MySQL data truncation.
ALTER TABLE employee_assessments
    MODIFY COLUMN status VARCHAR(40) NOT NULL DEFAULT 'DRAFT';
