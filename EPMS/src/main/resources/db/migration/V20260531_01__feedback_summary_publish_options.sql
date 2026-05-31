-- Patch A: persist HR-controlled 360 result publish options.
-- Campaign lifecycle remains CLOSED; result visibility is controlled by feedback_summary.visibility_status.

ALTER TABLE feedback_summary
    ADD COLUMN IF NOT EXISTS include_overall_score BOOLEAN NOT NULL DEFAULT TRUE AFTER publish_note,
    ADD COLUMN IF NOT EXISTS include_competency_breakdown BOOLEAN NOT NULL DEFAULT TRUE AFTER include_overall_score,
    ADD COLUMN IF NOT EXISTS include_self_vs_others BOOLEAN NOT NULL DEFAULT TRUE AFTER include_competency_breakdown,
    ADD COLUMN IF NOT EXISTS include_comments BOOLEAN NOT NULL DEFAULT FALSE AFTER include_self_vs_others,
    ADD COLUMN IF NOT EXISTS include_score_explanation BOOLEAN NOT NULL DEFAULT TRUE AFTER include_comments;

UPDATE feedback_summary
SET include_overall_score = COALESCE(include_overall_score, TRUE),
    include_competency_breakdown = COALESCE(include_competency_breakdown, TRUE),
    include_self_vs_others = COALESCE(include_self_vs_others, TRUE),
    include_comments = COALESCE(include_comments, FALSE),
    include_score_explanation = COALESCE(include_score_explanation, TRUE);
