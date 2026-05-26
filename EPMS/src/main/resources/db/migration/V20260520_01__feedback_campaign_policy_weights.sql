-- Campaign Setup Patch A: campaign-level privacy policy, scoring weights, and evaluator snapshots.

ALTER TABLE feedback_campaigns
    ADD COLUMN IF NOT EXISTS manager_feedback_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS peer_feedback_anonymous BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS subordinate_feedback_anonymous BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS self_feedback_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS redistribute_missing_relationship_weight BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE feedback_evaluator_assignments
    ADD COLUMN IF NOT EXISTS evaluator_user_id INT NULL,
    ADD COLUMN IF NOT EXISTS evaluator_employee_code VARCHAR(80) NULL,
    ADD COLUMN IF NOT EXISTS evaluator_employee_name VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS evaluator_employee_email VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS evaluator_department_id INT NULL,
    ADD COLUMN IF NOT EXISTS evaluator_position_id INT NULL,
    ADD COLUMN IF NOT EXISTS evaluator_position_name VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS manual_reason TEXT NULL;

CREATE TABLE IF NOT EXISTS feedback_campaign_relationship_weights (
                                                                      id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                                                      campaign_id BIGINT NOT NULL,
                                                                      relationship_type VARCHAR(40) NOT NULL,
                                                                      weight_percent DECIMAL(7,2) NOT NULL DEFAULT 0.00,
                                                                      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                                                      updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                                                      CONSTRAINT uk_feedback_campaign_relationship_weight UNIQUE (campaign_id, relationship_type),
                                                                      CONSTRAINT fk_feedback_campaign_relationship_weight_campaign FOREIGN KEY (campaign_id) REFERENCES feedback_campaigns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS feedback_campaign_competency_weights (
                                                                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                                                    campaign_id BIGINT NOT NULL,
                                                                    competency_id BIGINT NOT NULL,
                                                                    competency_code_snapshot VARCHAR(120) NOT NULL,
                                                                    competency_name_snapshot VARCHAR(255) NOT NULL,
                                                                    weight_percent DECIMAL(7,2) NOT NULL DEFAULT 0.00,
                                                                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                                                    updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                                                    CONSTRAINT uk_feedback_campaign_competency_weight UNIQUE (campaign_id, competency_id),
                                                                    CONSTRAINT fk_feedback_campaign_competency_weight_campaign FOREIGN KEY (campaign_id) REFERENCES feedback_campaigns(id) ON DELETE CASCADE,
                                                                    CONSTRAINT fk_feedback_campaign_competency_weight_competency FOREIGN KEY (competency_id) REFERENCES feedback_competencies(id)
);

INSERT INTO feedback_campaign_relationship_weights (campaign_id, relationship_type, weight_percent)
SELECT c.id, 'MANAGER', 40.00 FROM feedback_campaigns c
WHERE NOT EXISTS (
    SELECT 1 FROM feedback_campaign_relationship_weights w WHERE w.campaign_id = c.id AND w.relationship_type = 'MANAGER'
);

INSERT INTO feedback_campaign_relationship_weights (campaign_id, relationship_type, weight_percent)
SELECT c.id, 'PEER', 30.00 FROM feedback_campaigns c
WHERE NOT EXISTS (
    SELECT 1 FROM feedback_campaign_relationship_weights w WHERE w.campaign_id = c.id AND w.relationship_type = 'PEER'
);

INSERT INTO feedback_campaign_relationship_weights (campaign_id, relationship_type, weight_percent)
SELECT c.id, 'SUBORDINATE', 20.00 FROM feedback_campaigns c
WHERE NOT EXISTS (
    SELECT 1 FROM feedback_campaign_relationship_weights w WHERE w.campaign_id = c.id AND w.relationship_type = 'SUBORDINATE'
);

INSERT INTO feedback_campaign_relationship_weights (campaign_id, relationship_type, weight_percent)
SELECT c.id, 'SELF', 10.00 FROM feedback_campaigns c
WHERE NOT EXISTS (
    SELECT 1 FROM feedback_campaign_relationship_weights w WHERE w.campaign_id = c.id AND w.relationship_type = 'SELF'
);
