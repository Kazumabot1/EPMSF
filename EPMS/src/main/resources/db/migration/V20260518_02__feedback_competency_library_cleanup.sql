-- Question Bank competency cleanup.
-- Competencies are library groupings only. Weight/status/category/display order remain internal compatibility fields.

INSERT INTO feedback_competencies (code, name, description, category, default_weight_percent, display_order, status)
SELECT 'COMMUNICATION_SKILLS', 'Communication Skills', 'Measures how clearly, respectfully, and effectively employees share information and listen to others.', 'PERFORMANCE_360', 0, 10, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM feedback_competencies WHERE UPPER(code) = 'COMMUNICATION_SKILLS');

INSERT INTO feedback_competencies (code, name, description, category, default_weight_percent, display_order, status)
SELECT 'TEAMWORK_COLLABORATION', 'Teamwork & Collaboration', 'Measures how effectively employees work with others toward shared outcomes.', 'PERFORMANCE_360', 0, 20, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM feedback_competencies WHERE UPPER(code) = 'TEAMWORK_COLLABORATION');

INSERT INTO feedback_competencies (code, name, description, category, default_weight_percent, display_order, status)
SELECT 'TECHNICAL_SKILLS', 'Technical Skills', 'Measures role-specific knowledge, technical capability, and effective application of skills.', 'PERFORMANCE_360', 0, 30, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM feedback_competencies WHERE UPPER(code) = 'TECHNICAL_SKILLS');

INSERT INTO feedback_competencies (code, name, description, category, default_weight_percent, display_order, status)
SELECT 'WORK_QUALITY', 'Work Quality', 'Measures accuracy, consistency, and quality of delivered work.', 'PERFORMANCE_360', 0, 40, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM feedback_competencies WHERE UPPER(code) = 'WORK_QUALITY');

INSERT INTO feedback_competencies (code, name, description, category, default_weight_percent, display_order, status)
SELECT 'ACCOUNTABILITY_RESPONSIBILITY', 'Accountability & Responsibility', 'Measures ownership of assigned work, follow-through, and responsibility for outcomes.', 'PERFORMANCE_360', 0, 50, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM feedback_competencies WHERE UPPER(code) = 'ACCOUNTABILITY_RESPONSIBILITY');

INSERT INTO feedback_competencies (code, name, description, category, default_weight_percent, display_order, status)
SELECT 'PROBLEM_SOLVING', 'Problem Solving', 'Measures how employees analyze issues and propose practical solutions.', 'PERFORMANCE_360', 0, 60, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM feedback_competencies WHERE UPPER(code) = 'PROBLEM_SOLVING');

INSERT INTO feedback_competencies (code, name, description, category, default_weight_percent, display_order, status)
SELECT 'LEARNING_IMPROVEMENT', 'Learning & Improvement', 'Measures willingness to learn, improve, and adapt based on feedback and changing needs.', 'PERFORMANCE_360', 0, 70, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM feedback_competencies WHERE UPPER(code) = 'LEARNING_IMPROVEMENT');

INSERT INTO feedback_competencies (code, name, description, category, default_weight_percent, display_order, status)
SELECT 'ATTITUDE_PROFESSIONALISM', 'Attitude & Professionalism', 'Measures professional conduct, respect, reliability, and positive workplace behavior.', 'PERFORMANCE_360', 0, 80, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM feedback_competencies WHERE UPPER(code) = 'ATTITUDE_PROFESSIONALISM');

UPDATE feedback_competencies
SET name = 'Communication Skills',
    description = COALESCE(NULLIF(description, ''), 'Measures how clearly, respectfully, and effectively employees share information and listen to others.'),
    category = 'PERFORMANCE_360',
    default_weight_percent = 0,
    display_order = 10,
    status = 'ACTIVE'
WHERE UPPER(code) = 'COMMUNICATION_SKILLS';

UPDATE feedback_competencies
SET name = 'Teamwork & Collaboration',
    description = COALESCE(NULLIF(description, ''), 'Measures how effectively employees work with others toward shared outcomes.'),
    category = 'PERFORMANCE_360',
    default_weight_percent = 0,
    display_order = 20,
    status = 'ACTIVE'
WHERE UPPER(code) = 'TEAMWORK_COLLABORATION';

UPDATE feedback_competencies
SET name = 'Technical Skills',
    description = COALESCE(NULLIF(description, ''), 'Measures role-specific knowledge, technical capability, and effective application of skills.'),
    category = 'PERFORMANCE_360',
    default_weight_percent = 0,
    display_order = 30,
    status = 'ACTIVE'
WHERE UPPER(code) = 'TECHNICAL_SKILLS';

UPDATE feedback_competencies
SET name = 'Work Quality',
    description = COALESCE(NULLIF(description, ''), 'Measures accuracy, consistency, and quality of delivered work.'),
    category = 'PERFORMANCE_360',
    default_weight_percent = 0,
    display_order = 40,
    status = 'ACTIVE'
WHERE UPPER(code) = 'WORK_QUALITY';

UPDATE feedback_competencies
SET name = 'Accountability & Responsibility',
    description = COALESCE(NULLIF(description, ''), 'Measures ownership of assigned work, follow-through, and responsibility for outcomes.'),
    category = 'PERFORMANCE_360',
    default_weight_percent = 0,
    display_order = 50,
    status = 'ACTIVE'
WHERE UPPER(code) = 'ACCOUNTABILITY_RESPONSIBILITY';

UPDATE feedback_competencies
SET name = 'Problem Solving',
    description = COALESCE(NULLIF(description, ''), 'Measures how employees analyze issues and propose practical solutions.'),
    category = 'PERFORMANCE_360',
    default_weight_percent = 0,
    display_order = 60,
    status = 'ACTIVE'
WHERE UPPER(code) = 'PROBLEM_SOLVING';

UPDATE feedback_competencies
SET name = 'Learning & Improvement',
    description = COALESCE(NULLIF(description, ''), 'Measures willingness to learn, improve, and adapt based on feedback and changing needs.'),
    category = 'PERFORMANCE_360',
    default_weight_percent = 0,
    display_order = 70,
    status = 'ACTIVE'
WHERE UPPER(code) = 'LEARNING_IMPROVEMENT';

UPDATE feedback_competencies
SET name = 'Attitude & Professionalism',
    description = COALESCE(NULLIF(description, ''), 'Measures professional conduct, respect, reliability, and positive workplace behavior.'),
    category = 'PERFORMANCE_360',
    default_weight_percent = 0,
    display_order = 80,
    status = 'ACTIVE'
WHERE UPPER(code) = 'ATTITUDE_PROFESSIONALISM';

-- Create real competency records for legacy question references that do not exist yet.
INSERT INTO feedback_competencies (code, name, description, category, default_weight_percent, display_order, status)
SELECT DISTINCT
    qb.competency_code,
    CONCAT(UPPER(SUBSTRING(REPLACE(LOWER(qb.competency_code), '_', ' '), 1, 1)), SUBSTRING(REPLACE(LOWER(qb.competency_code), '_', ' '), 2)),
    NULL,
    'PERFORMANCE_360',
    0,
    500,
    'ACTIVE'
FROM feedback_question_bank qb
         LEFT JOIN feedback_competencies fc ON UPPER(fc.code) = UPPER(qb.competency_code)
WHERE qb.competency_code IS NOT NULL
  AND qb.competency_code <> ''
  AND fc.id IS NULL;

UPDATE feedback_competencies
SET category = 'PERFORMANCE_360',
    default_weight_percent = 0,
    status = 'ACTIVE'
WHERE category IS NULL
   OR category = ''
   OR default_weight_percent IS NULL
   OR default_weight_percent <> 0
   OR status IS NULL
   OR status <> 'ACTIVE';
