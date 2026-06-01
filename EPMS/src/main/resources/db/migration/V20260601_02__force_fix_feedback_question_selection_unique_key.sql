-- Force-fix 360 campaign question snapshot uniqueness.
-- Why this migration exists:
-- Older databases still have uk_campaign_question_selection on only:
--   campaign_id, relationship_type, target_level_code, question_code
-- That blocks valid question snapshot variants for different departments/positions
-- and causes 409 Conflict on PUT /feedback/campaigns/{id}/question-review.

SET @question_selection_unique_exists := (
    SELECT COUNT(1)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'feedback_campaign_question_selections'
      AND INDEX_NAME = 'uk_campaign_question_selection'
);

SET @drop_question_selection_unique_sql := IF(
        @question_selection_unique_exists > 0,
        'ALTER TABLE feedback_campaign_question_selections DROP INDEX uk_campaign_question_selection',
        'SELECT 1'
                                           );

PREPARE drop_question_selection_unique_stmt FROM @drop_question_selection_unique_sql;
EXECUTE drop_question_selection_unique_stmt;
DEALLOCATE PREPARE drop_question_selection_unique_stmt;

ALTER TABLE feedback_campaign_question_selections
    ADD CONSTRAINT uk_campaign_question_selection
        UNIQUE (
                campaign_id,
                relationship_type,
                target_level_code,
                target_department_id,
                target_position_id,
                question_code
            );

SET @question_selection_specific_group_index_exists := (
    SELECT COUNT(1)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'feedback_campaign_question_selections'
      AND INDEX_NAME = 'idx_campaign_question_selection_specific_group'
);

SET @create_question_selection_specific_group_index_sql := IF(
        @question_selection_specific_group_index_exists = 0,
        'CREATE INDEX idx_campaign_question_selection_specific_group ON feedback_campaign_question_selections(campaign_id, relationship_type, target_level_code, target_department_id, target_position_id, is_included)',
        'SELECT 1'
                                                           );

PREPARE create_question_selection_specific_group_index_stmt FROM @create_question_selection_specific_group_index_sql;
EXECUTE create_question_selection_specific_group_index_stmt;
DEALLOCATE PREPARE create_question_selection_specific_group_index_stmt;
