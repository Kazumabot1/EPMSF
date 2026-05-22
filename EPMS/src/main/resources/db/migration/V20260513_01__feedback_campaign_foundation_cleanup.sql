-- Campaign Foundation Cleanup and Wizard Skeleton
-- Removes review-round based campaign setup and Project Stakeholder relationship usage for the new 360 core flow.

ALTER TABLE feedback_campaigns
    ADD COLUMN IF NOT EXISTS campaign_type VARCHAR(80) NOT NULL DEFAULT '360 Feedback';

UPDATE feedback_campaigns
SET campaign_type = COALESCE(campaign_type, '360 Feedback')
WHERE campaign_type IS NULL OR campaign_type = '';

UPDATE feedback_campaigns
SET status = 'DRAFT'
WHERE status = 'CANCELLED';

ALTER TABLE feedback_campaigns
    MODIFY COLUMN form_id BIGINT NULL;

DROP INDEX IF EXISTS idx_feedback_campaigns_round_status ON feedback_campaigns;

ALTER TABLE feedback_campaigns
    DROP COLUMN IF EXISTS review_round;

UPDATE feedback_question_applicability_rules
SET active = FALSE
WHERE evaluator_relationship_type = 'PROJECT_STAKEHOLDER';

UPDATE feedback_evaluator_assignments
SET source_type = 'PEER'
WHERE source_type = 'PROJECT_STAKEHOLDER';
