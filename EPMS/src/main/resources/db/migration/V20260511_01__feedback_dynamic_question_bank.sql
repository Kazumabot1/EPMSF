-- Dynamic 360 feedback question architecture.
-- Adds reusable master question bank, level/relationship applicability rules,
-- and immutable per-assignment question snapshots.

CREATE TABLE IF NOT EXISTS feedback_question_bank (
                                                      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                                                      question_code VARCHAR(80) NOT NULL,
                                                      competency_code VARCHAR(80) NOT NULL,
                                                      default_text TEXT NOT NULL,
                                                      default_response_type VARCHAR(40) NOT NULL DEFAULT 'RATING_WITH_COMMENT',
                                                      default_scoring_behavior VARCHAR(30) NOT NULL DEFAULT 'SCORED',
                                                      default_rating_scale_id INT NULL,
                                                      default_weight DOUBLE NOT NULL DEFAULT 1,
                                                      default_required BOOLEAN NOT NULL DEFAULT TRUE,
                                                      status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
                                                      created_by_user_id BIGINT NOT NULL DEFAULT 0,
                                                      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                                      updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                                      CONSTRAINT uk_feedback_question_bank_code UNIQUE (question_code)
);

CREATE TABLE IF NOT EXISTS feedback_question_versions (
                                                          id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                                                          question_bank_id BIGINT NOT NULL,
                                                          version_number INT NOT NULL DEFAULT 1,
                                                          question_text TEXT NOT NULL,
                                                          response_type VARCHAR(40) NOT NULL DEFAULT 'RATING_WITH_COMMENT',
                                                          scoring_behavior VARCHAR(30) NOT NULL DEFAULT 'SCORED',
                                                          rating_scale_id INT NULL,
                                                          help_text TEXT NULL,
                                                          is_active BOOLEAN NOT NULL DEFAULT TRUE,
                                                          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                                          CONSTRAINT uk_feedback_question_version UNIQUE (question_bank_id, version_number),
                                                          CONSTRAINT fk_feedback_question_versions_bank FOREIGN KEY (question_bank_id) REFERENCES feedback_question_bank(id)
);

CREATE TABLE IF NOT EXISTS feedback_question_applicability_rules (
                                                                     id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                                                                     question_version_id BIGINT NOT NULL,
                                                                     target_level_min_rank INT NOT NULL,
                                                                     target_level_max_rank INT NOT NULL,
                                                                     target_position_id BIGINT NULL,
                                                                     target_department_id BIGINT NULL,
                                                                     evaluator_relationship_type VARCHAR(40) NOT NULL,
                                                                     section_code VARCHAR(80) NOT NULL,
                                                                     section_title VARCHAR(150) NOT NULL,
                                                                     section_order INT NOT NULL DEFAULT 1,
                                                                     display_order INT NOT NULL DEFAULT 1,
                                                                     required_override BOOLEAN NULL,
                                                                     weight_override DOUBLE NULL,
                                                                     rule_priority INT NOT NULL DEFAULT 100,
                                                                     active BOOLEAN NOT NULL DEFAULT TRUE,
                                                                     valid_from DATE NULL,
                                                                     valid_to DATE NULL,
                                                                     condition_json JSON NULL,
                                                                     created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                                                     updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                                                     CONSTRAINT fk_feedback_question_rules_version FOREIGN KEY (question_version_id) REFERENCES feedback_question_versions(id)
);

CREATE TABLE IF NOT EXISTS feedback_assignment_questions (
                                                             id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                                                             assignment_id BIGINT NOT NULL,
                                                             source_question_id BIGINT NULL,
                                                             question_version_id BIGINT NULL,
                                                             question_bank_id BIGINT NULL,
                                                             question_code VARCHAR(80) NOT NULL,
                                                             competency_code VARCHAR(80) NULL,
                                                             question_text_snapshot TEXT NOT NULL,
                                                             response_type VARCHAR(40) NOT NULL DEFAULT 'RATING_WITH_COMMENT',
                                                             scoring_behavior VARCHAR(30) NOT NULL DEFAULT 'SCORED',
                                                             rating_scale_id INT NULL,
                                                             is_required BOOLEAN NOT NULL DEFAULT TRUE,
                                                             weight DOUBLE NOT NULL DEFAULT 1,
                                                             section_code VARCHAR(80) NOT NULL,
                                                             section_title VARCHAR(150) NOT NULL,
                                                             section_order INT NOT NULL DEFAULT 1,
                                                             display_order INT NOT NULL DEFAULT 1,
                                                             created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                                             CONSTRAINT uk_feedback_assignment_question_code UNIQUE (assignment_id, question_code),
                                                             CONSTRAINT fk_feedback_assignment_questions_assignment FOREIGN KEY (assignment_id) REFERENCES feedback_evaluator_assignments(id),
                                                             CONSTRAINT fk_feedback_assignment_questions_source FOREIGN KEY (source_question_id) REFERENCES feedback_questions(id),
                                                             CONSTRAINT fk_feedback_assignment_questions_version FOREIGN KEY (question_version_id) REFERENCES feedback_question_versions(id)
);

ALTER TABLE feedback_response_items
    ADD COLUMN IF NOT EXISTS assignment_question_id BIGINT NULL AFTER question_id;

-- New dynamic rows validate against assignment_question_id. Legacy question_id remains nullable for bank-only questions.
ALTER TABLE feedback_response_items
    MODIFY COLUMN question_id BIGINT NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_question_rules_lookup
    ON feedback_question_applicability_rules (active, evaluator_relationship_type, target_level_min_rank, target_level_max_rank);

CREATE INDEX IF NOT EXISTS idx_feedback_assignment_questions_assignment
    ON feedback_assignment_questions (assignment_id, section_order, display_order);

CREATE INDEX IF NOT EXISTS idx_feedback_response_items_assignment_question
    ON feedback_response_items (assignment_question_id);

-- Seed RD-aligned reusable 360 feedback master questions.
INSERT INTO feedback_question_bank (question_code, competency_code, default_text, default_response_type, default_scoring_behavior, default_weight, default_required, status, created_by_user_id)
VALUES
    ('FB-COMM-001', 'COMMUNICATION', 'Communicates clearly and effectively with others.', 'RATING_WITH_COMMENT', 'SCORED', 1, TRUE, 'ACTIVE', 0),
    ('FB-TEAM-001', 'TEAMWORK', 'Collaborates well with team members and contributes positively to team goals.', 'RATING_WITH_COMMENT', 'SCORED', 1, TRUE, 'ACTIVE', 0),
    ('FB-TECH-001', 'TECHNICAL_SKILL', 'Demonstrates the technical or functional skills required for the role.', 'RATING_WITH_COMMENT', 'SCORED', 1, TRUE, 'ACTIVE', 0),
    ('FB-WORK-001', 'WORK_QUALITY', 'Produces accurate, reliable, and high-quality work.', 'RATING_WITH_COMMENT', 'SCORED', 1, TRUE, 'ACTIVE', 0),
    ('FB-ACC-001', 'ACCOUNTABILITY', 'Takes ownership of responsibilities and follows through on commitments.', 'RATING_WITH_COMMENT', 'SCORED', 1, TRUE, 'ACTIVE', 0),
    ('FB-PROB-001', 'PROBLEM_SOLVING', 'Analyzes issues effectively and proposes practical solutions.', 'RATING_WITH_COMMENT', 'SCORED', 1, TRUE, 'ACTIVE', 0),
    ('FB-LEARN-001', 'LEARNING_IMPROVEMENT', 'Shows willingness to learn, improve, and adapt to change.', 'RATING_WITH_COMMENT', 'SCORED', 1, TRUE, 'ACTIVE', 0),
    ('FB-PROF-001', 'PROFESSIONALISM', 'Demonstrates professionalism, respect, and a positive workplace attitude.', 'RATING_WITH_COMMENT', 'SCORED', 1, TRUE, 'ACTIVE', 0),
    ('FB-LEAD-001', 'LEADERSHIP', 'Provides clear direction, coaching, and support to others.', 'RATING_WITH_COMMENT', 'SCORED', 1.5, TRUE, 'ACTIVE', 0),
    ('FB-STRAT-001', 'STRATEGIC_EXECUTION', 'Translates business priorities into clear plans and measurable execution.', 'RATING_WITH_COMMENT', 'SCORED', 1.5, TRUE, 'ACTIVE', 0),
    ('FB-RELY-001', 'RELIABILITY', 'Can be relied upon to attend work, follow procedures, and complete assigned duties.', 'RATING_WITH_COMMENT', 'SCORED', 1, TRUE, 'ACTIVE', 0),
    ('FB-SAFE-001', 'COMPLIANCE_SAFETY', 'Follows company policies, safety expectations, and operational procedures.', 'RATING_WITH_COMMENT', 'SCORED', 1, TRUE, 'ACTIVE', 0)
ON DUPLICATE KEY UPDATE
                     competency_code = VALUES(competency_code),
                     default_text = VALUES(default_text),
                     default_response_type = VALUES(default_response_type),
                     default_scoring_behavior = VALUES(default_scoring_behavior),
                     default_weight = VALUES(default_weight),
                     default_required = VALUES(default_required),
                     status = 'ACTIVE';

INSERT INTO feedback_question_versions (question_bank_id, version_number, question_text, response_type, scoring_behavior, rating_scale_id, is_active)
SELECT qb.id, 1, qb.default_text, qb.default_response_type, qb.default_scoring_behavior, qb.default_rating_scale_id, TRUE
FROM feedback_question_bank qb
WHERE qb.question_code IN (
                           'FB-COMM-001','FB-TEAM-001','FB-TECH-001','FB-WORK-001','FB-ACC-001','FB-PROB-001',
                           'FB-LEARN-001','FB-PROF-001','FB-LEAD-001','FB-STRAT-001','FB-RELY-001','FB-SAFE-001'
    )
ON DUPLICATE KEY UPDATE
                     question_text = VALUES(question_text),
                     response_type = VALUES(response_type),
                     scoring_behavior = VALUES(scoring_behavior),
                     rating_scale_id = VALUES(rating_scale_id),
                     is_active = TRUE;

-- Rules intentionally use broad level bands so existing L01-L09 or LD1-LD9 level codes work after numeric parsing.
INSERT INTO feedback_question_applicability_rules (
    question_version_id, target_level_min_rank, target_level_max_rank, evaluator_relationship_type,
    section_code, section_title, section_order, display_order, weight_override, active
)
SELECT qv.id, rules.min_rank, rules.max_rank, rules.relationship_type,
       rules.section_code, rules.section_title, rules.section_order, rules.display_order, rules.weight_override, TRUE
FROM feedback_question_versions qv
         JOIN feedback_question_bank qb ON qb.id = qv.question_bank_id
         JOIN (
    SELECT 'FB-COMM-001' code, 1 min_rank, 9 max_rank, 'ANY' relationship_type, 'CORE_BEHAVIOR' section_code, 'Core Behavior' section_title, 1 section_order, 10 display_order, NULL weight_override UNION ALL
    SELECT 'FB-TEAM-001', 1, 9, 'ANY', 'CORE_BEHAVIOR', 'Core Behavior', 1, 20, NULL UNION ALL
    SELECT 'FB-ACC-001', 1, 9, 'ANY', 'CORE_BEHAVIOR', 'Core Behavior', 1, 30, NULL UNION ALL
    SELECT 'FB-PROF-001', 1, 9, 'ANY', 'CORE_BEHAVIOR', 'Core Behavior', 1, 40, NULL UNION ALL
    SELECT 'FB-WORK-001', 3, 9, 'MANAGER', 'PERFORMANCE', 'Performance & Delivery', 2, 10, NULL UNION ALL
    SELECT 'FB-WORK-001', 5, 9, 'SELF', 'PERFORMANCE', 'Performance & Delivery', 2, 10, NULL UNION ALL
    SELECT 'FB-TECH-001', 5, 8, 'MANAGER', 'TECHNICAL', 'Technical / Functional Capability', 2, 20, NULL UNION ALL
    SELECT 'FB-TECH-001', 5, 8, 'PEER', 'TECHNICAL', 'Technical / Functional Capability', 2, 20, NULL UNION ALL
    SELECT 'FB-TECH-001', 5, 8, 'SELF', 'TECHNICAL', 'Technical / Functional Capability', 2, 20, NULL UNION ALL
    SELECT 'FB-PROB-001', 1, 8, 'MANAGER', 'PERFORMANCE', 'Performance & Delivery', 2, 30, NULL UNION ALL
    SELECT 'FB-PROB-001', 1, 8, 'PEER', 'PERFORMANCE', 'Performance & Delivery', 2, 30, NULL UNION ALL
    SELECT 'FB-PROB-001', 1, 8, 'SELF', 'PERFORMANCE', 'Performance & Delivery', 2, 30, NULL UNION ALL
    SELECT 'FB-LEARN-001', 4, 9, 'ANY', 'GROWTH', 'Learning & Improvement', 3, 10, NULL UNION ALL
    SELECT 'FB-LEAD-001', 1, 6, 'SUBORDINATE', 'LEADERSHIP', 'Leadership & People Management', 4, 10, 1.5 UNION ALL
    SELECT 'FB-LEAD-001', 1, 6, 'MANAGER', 'LEADERSHIP', 'Leadership & People Management', 4, 10, 1.5 UNION ALL
    SELECT 'FB-STRAT-001', 1, 4, 'MANAGER', 'LEADERSHIP', 'Leadership & People Management', 4, 20, 1.5 UNION ALL
    SELECT 'FB-STRAT-001', 1, 4, 'PEER', 'LEADERSHIP', 'Leadership & People Management', 4, 20, 1.5 UNION ALL
    SELECT 'FB-STRAT-001', 1, 4, 'SELF', 'LEADERSHIP', 'Leadership & People Management', 4, 20, 1.5 UNION ALL
    SELECT 'FB-RELY-001', 7, 9, 'MANAGER', 'OPERATIONS', 'Operational Reliability', 2, 10, NULL UNION ALL
    SELECT 'FB-RELY-001', 7, 9, 'SELF', 'OPERATIONS', 'Operational Reliability', 2, 10, NULL UNION ALL
    SELECT 'FB-SAFE-001', 7, 9, 'MANAGER', 'OPERATIONS', 'Operational Reliability', 2, 20, NULL UNION ALL
    SELECT 'FB-SAFE-001', 7, 9, 'SELF', 'OPERATIONS', 'Operational Reliability', 2, 20, NULL
) rules ON rules.code = qb.question_code
WHERE qv.version_number = 1
  AND NOT EXISTS (
    SELECT 1
    FROM feedback_question_applicability_rules existing
    WHERE existing.question_version_id = qv.id
      AND existing.target_level_min_rank = rules.min_rank
      AND existing.target_level_max_rank = rules.max_rank
      AND existing.evaluator_relationship_type = rules.relationship_type
      AND existing.section_code = rules.section_code
      AND existing.display_order = rules.display_order
);
