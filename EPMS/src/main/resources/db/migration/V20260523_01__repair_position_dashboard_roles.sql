UPDATE positions p
JOIN roles r ON REPLACE(REPLACE(UPPER(r.name), 'ROLE_', ''), '_', '') = 'HR'
SET p.role_id = r.id
WHERE p.role_id IS NULL
  AND p.description LIKE '%mapped to HR dashboard role%';

UPDATE positions p
JOIN roles r ON REPLACE(REPLACE(UPPER(r.name), 'ROLE_', ''), '_', '') = 'ADMIN'
SET p.role_id = r.id
WHERE p.role_id IS NULL
  AND p.description LIKE '%mapped to ADMIN dashboard role%';

UPDATE positions p
JOIN roles r ON REPLACE(REPLACE(UPPER(r.name), 'ROLE_', ''), '_', '') = 'CEO'
SET p.role_id = r.id
WHERE p.role_id IS NULL
  AND p.description LIKE '%mapped to CEO dashboard role%';

UPDATE positions p
JOIN roles r ON REPLACE(REPLACE(UPPER(r.name), 'ROLE_', ''), '_', '') = 'EMPLOYEE'
SET p.role_id = r.id
WHERE p.role_id IS NULL
  AND p.description LIKE '%mapped to EMPLOYEE dashboard role%';

UPDATE positions p
JOIN roles r ON REPLACE(REPLACE(UPPER(r.name), 'ROLE_', ''), '_', '') = 'DEPARTMENTHEAD'
SET p.role_id = r.id
WHERE p.role_id IS NULL
  AND (
    p.description LIKE '%mapped to DEPARTMENTHEAD dashboard role%'
    OR p.description LIKE '%mapped to DEPARTMENT_HEAD dashboard role%'
    OR p.description LIKE '%mapped to DEPARTMENT HEAD dashboard role%'
  );

UPDATE positions p
JOIN roles r ON REPLACE(REPLACE(UPPER(r.name), 'ROLE_', ''), '_', '') = 'MANAGER'
SET p.role_id = r.id
WHERE p.role_id IS NULL
  AND p.description LIKE '%mapped to MANAGER dashboard role%';
