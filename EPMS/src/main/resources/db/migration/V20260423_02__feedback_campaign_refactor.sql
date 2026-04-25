CREATE TABLE IF NOT EXISTS feedback_campaigns (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_by_user_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE feedback_requests
    ADD COLUMN IF NOT EXISTS campaign_id BIGINT NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_requests_campaign
    ON feedback_requests (campaign_id);
