CREATE TABLE IF NOT EXISTS notification_template_channels (
    notification_template_id INTEGER NOT NULL,
    channel VARCHAR(32) NOT NULL,
    PRIMARY KEY (notification_template_id, channel),
    CONSTRAINT fk_notification_template_channels_template
        FOREIGN KEY (notification_template_id)
        REFERENCES notification_templates(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notification_template_target_roles (
    notification_template_id INTEGER NOT NULL,
    target_role VARCHAR(64) NOT NULL,
    PRIMARY KEY (notification_template_id, target_role),
    CONSTRAINT fk_notification_template_target_roles_template
        FOREIGN KEY (notification_template_id)
        REFERENCES notification_templates(id)
        ON DELETE CASCADE
);

INSERT IGNORE INTO notification_template_channels (notification_template_id, channel)
SELECT id,
       CASE
           WHEN LOWER(REPLACE(channel_type, '-', '_')) IN ('system', 'app', 'inapp') THEN 'in_app'
           WHEN LOWER(REPLACE(channel_type, '-', '_')) = 'email' THEN 'email'
           WHEN LOWER(REPLACE(channel_type, '-', '_')) = 'in_app' THEN 'in_app'
           ELSE LOWER(REPLACE(channel_type, '-', '_'))
       END
FROM notification_templates
WHERE channel_type IS NOT NULL
  AND TRIM(channel_type) <> '';
