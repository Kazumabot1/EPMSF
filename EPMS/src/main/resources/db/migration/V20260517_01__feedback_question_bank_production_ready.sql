-- Production-ready Question Bank foundation for performance 360 feedback.
-- Scope: Rating 1-5 + required comment only, competency library, and suggested default competency weights.

CREATE TABLE IF NOT EXISTS feedback_competencies (
                                                     id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                                                     code VARCHAR(80) NOT NULL,
                                                     name VARCHAR(150) NOT NULL,
                                                     description TEXT NULL,
                                                     category VARCHAR(80) NOT NULL DEFAULT 'PERFORMANCE_360',
                                                     default_weight_percent DOUBLE NOT NULL DEFAULT 0,
                                                     display_order INT NOT NULL DEFAULT 100,
                                                     status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
                                                     created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                                     updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                                     CONSTRAINT uk_feedback_competency_code UNIQUE (code)
);

INSERT INTO feedback_competencies (code, name, description, category, default_weight_percent, display_order, status)
VALUES
    ('COMMUNICATION_SKILLS', 'Communication Skills', 'Communicates clearly, respectfully, and effectively in written and verbal form.', 'PERFORMANCE_360', 12.5, 10, 'ACTIVE'),
    ('TEAMWORK_COLLABORATION', 'Teamwork & Collaboration', 'Works effectively with others and contributes to shared team outcomes.', 'PERFORMANCE_360', 12.5, 20, 'ACTIVE'),
    ('TECHNICAL_SKILLS', 'Technical Skills', 'Demonstrates the technical or functional capability required for the role.', 'PERFORMANCE_360', 12.5, 30, 'ACTIVE'),
    ('WORK_QUALITY', 'Work Quality', 'Produces accurate, reliable, and high-quality work outputs.', 'PERFORMANCE_360', 12.5, 40, 'ACTIVE'),
    ('ACCOUNTABILITY_RESPONSIBILITY', 'Accountability & Responsibility', 'Takes ownership of commitments and follows through reliably.', 'PERFORMANCE_360', 12.5, 50, 'ACTIVE'),
    ('PROBLEM_SOLVING', 'Problem Solving', 'Analyzes issues and contributes practical, constructive solutions.', 'PERFORMANCE_360', 12.5, 60, 'ACTIVE'),
    ('LEARNING_IMPROVEMENT', 'Learning & Improvement', 'Learns, improves, and adapts based on feedback and changing needs.', 'PERFORMANCE_360', 12.5, 70, 'ACTIVE'),
    ('ATTITUDE_PROFESSIONALISM', 'Attitude & Professionalism', 'Demonstrates professionalism, respect, and a constructive workplace attitude.', 'PERFORMANCE_360', 12.5, 80, 'ACTIVE')
ON DUPLICATE KEY UPDATE
                     name = VALUES(name),
                     description = VALUES(description),
                     category = VALUES(category),
                     default_weight_percent = VALUES(default_weight_percent),
                     display_order = VALUES(display_order),
                     status = VALUES(status);

-- Migrate legacy competency codes to the RD-aligned competency library.
UPDATE feedback_question_bank
SET competency_code = CASE competency_code
                          WHEN 'COMMUNICATION' THEN 'COMMUNICATION_SKILLS'
                          WHEN 'TEAMWORK' THEN 'TEAMWORK_COLLABORATION'
                          WHEN 'TECHNICAL_SKILL' THEN 'TECHNICAL_SKILLS'
                          WHEN 'ACCOUNTABILITY' THEN 'ACCOUNTABILITY_RESPONSIBILITY'
                          WHEN 'PROFESSIONALISM' THEN 'ATTITUDE_PROFESSIONALISM'
                          ELSE competency_code
    END;

-- Keep every bank question scored and comment-required for the current performance 360 scope.
UPDATE feedback_question_bank
SET default_response_type = 'RATING_WITH_COMMENT',
    default_scoring_behavior = 'SCORED',
    default_rating_scale_id = NULL,
    default_weight = 1,
    default_required = TRUE
WHERE default_response_type <> 'RATING_WITH_COMMENT'
   OR default_scoring_behavior <> 'SCORED'
   OR default_weight <> 1
   OR default_required <> TRUE;

UPDATE feedback_question_versions
SET response_type = 'RATING_WITH_COMMENT',
    scoring_behavior = 'SCORED',
    rating_scale_id = NULL
WHERE response_type <> 'RATING_WITH_COMMENT'
   OR scoring_behavior <> 'SCORED'
   OR rating_scale_id IS NOT NULL;

-- Preserve lifecycle states without collapsing them to INACTIVE going forward.
UPDATE feedback_question_bank SET status = 'RETIRED' WHERE status = 'INACTIVE';

-- Question/rule level weight overrides are no longer used. Campaign scoring snapshots should use selected competency weights.
UPDATE feedback_question_applicability_rules SET weight_override = NULL WHERE weight_override IS NOT NULL;
UPDATE feedback_assignment_questions SET weight = 1 WHERE weight <> 1;
