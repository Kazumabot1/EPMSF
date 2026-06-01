-- Fix 360 campaign question snapshot uniqueness.
-- The Java entity and question-review builder create separate question rows by
-- relationship + level + department + position + question. Older databases only
-- keyed by relationship + level + question, which raises 409 Conflict when two
-- departments/positions receive the same question in one new draft campaign.

SET @old_question_selection_unique_exists := (
    SELECT COUNT(1)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'feedback_campaign_question_selections'
      AND INDEX_NAME = 'uk_campaign_question_selection'
);

SET @drop_old_question_selection_unique_sql := IF(
        @old_question_selection_unique_exists > 0,
        'ALTER TABLE feedback_campaign_question_selections DROP INDEX uk_campaign_question_selection',
        'SELECT 1'
                                               );

PREPARE drop_old_question_selection_unique_stmt FROM @drop_old_question_selection_unique_sql;
EXECUTE drop_old_question_selection_unique_stmt;
DEALLOCATE PREPARE drop_old_question_selection_unique_stmt;

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

SET @question_selection_group_index_exists := (
    SELECT COUNT(1)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'feedback_campaign_question_selections'
      AND INDEX_NAME = 'idx_campaign_question_selection_specific_group'
);

SET @create_question_selection_group_index_sql := IF(
        @question_selection_group_index_exists = 0,
        'CREATE INDEX idx_campaign_question_selection_specific_group ON feedback_campaign_question_selections(campaign_id, relationship_type, target_level_code, target_department_id, target_position_id, is_included)',
        'SELECT 1'
                                                  );

PREPARE create_question_selection_group_index_stmt FROM @create_question_selection_group_index_sql;
EXECUTE create_question_selection_group_index_stmt;
DEALLOCATE PREPARE create_question_selection_group_index_stmt;
