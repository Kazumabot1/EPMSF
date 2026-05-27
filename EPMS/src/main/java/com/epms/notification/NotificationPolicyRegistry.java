package com.epms.notification;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Component
public class NotificationPolicyRegistry {

    private final Map<String, NotificationDeliveryPolicy> eventPolicies;
    private final Map<String, NotificationSettingDefinition> settingDefinitions;

    public NotificationPolicyRegistry() {
        Map<String, NotificationDeliveryPolicy> policies = new LinkedHashMap<>();

        registerRequired(policies, NotificationEventKey.KPI_SCORING_REQUESTED, NotificationCategory.KPI_WORKFLOW);
        registerRequired(policies, NotificationEventKey.KPI_EMPLOYEE_TARGET_ASSIGNED, NotificationCategory.KPI_WORKFLOW);
        registerRequired(policies, NotificationEventKey.KPI_POSITION_CHANGE_SCORING_REQUIRED, NotificationCategory.KPI_WORKFLOW);
        registerRequired(policies, NotificationEventKey.KPI_CYCLE_WRAP_UP, NotificationCategory.KPI_WORKFLOW);
        registerRequired(policies, NotificationEventKey.KPI_RESULT_FINALIZED, NotificationCategory.KPI_WORKFLOW);
        registerOptional(policies, NotificationEventKey.KPI_HR_SUMMARY, NotificationCategory.KPI_SUMMARY);
        registerRequired(policies, NotificationEventKey.DEPARTMENT_KPI_APPROVAL_REQUESTED, NotificationCategory.KPI_WORKFLOW);
        registerRequired(policies, NotificationEventKey.DEPARTMENT_KPI_APPROVAL_DECIDED, NotificationCategory.KPI_WORKFLOW);
        registerRequired(policies, NotificationEventKey.DEPARTMENT_KPI_FINALIZED, NotificationCategory.KPI_WORKFLOW);

        registerRequired(policies, NotificationEventKey.APPRAISAL_CYCLE_ACTIVATED, NotificationCategory.APPRAISAL_WORKFLOW);
        registerRequired(policies, NotificationEventKey.APPRAISAL_DEADLINE_REMINDER, NotificationCategory.APPRAISAL_WORKFLOW);
        registerRequired(policies, NotificationEventKey.APPRAISAL_REVIEW_SUBMITTED, NotificationCategory.APPRAISAL_WORKFLOW);
        registerRequired(policies, NotificationEventKey.APPRAISAL_RESULT_PUBLISHED, NotificationCategory.APPRAISAL_WORKFLOW);
        registerRequired(policies, NotificationEventKey.APPRAISAL_CYCLE_LOCKED, NotificationCategory.APPRAISAL_WORKFLOW);
        registerRequired(policies, NotificationEventKey.APPRAISAL_CYCLE_COMPLETED, NotificationCategory.APPRAISAL_WORKFLOW);

        registerRequired(policies, NotificationEventKey.FEEDBACK_360_TASK_ASSIGNED, NotificationCategory.FEEDBACK_360_WORKFLOW);
        registerRequired(policies, NotificationEventKey.FEEDBACK_360_DEADLINE_REMINDER, NotificationCategory.FEEDBACK_360_WORKFLOW);
        registerRequired(policies, NotificationEventKey.FEEDBACK_360_OVERDUE_REMINDER, NotificationCategory.FEEDBACK_360_WORKFLOW);
        registerRequired(policies, NotificationEventKey.FEEDBACK_360_SUMMARY_PUBLISHED, NotificationCategory.FEEDBACK_360_WORKFLOW);
        registerRequired(policies, NotificationEventKey.FEEDBACK_360_DRAFT_AUTO_SUBMITTED, NotificationCategory.FEEDBACK_360_WORKFLOW);
        registerRequired(policies, NotificationEventKey.FEEDBACK_360_EARLY_CLOSE_REVIEW, NotificationCategory.FEEDBACK_360_WORKFLOW);
        registerRequired(policies, NotificationEventKey.FEEDBACK_360_EARLY_CLOSE_DECIDED, NotificationCategory.FEEDBACK_360_WORKFLOW);

        registerOptional(policies, NotificationEventKey.CONTINUOUS_FEEDBACK_RECEIVED, NotificationCategory.CONTINUOUS_FEEDBACK);

        registerRequired(policies, NotificationEventKey.MEETING_CREATED, NotificationCategory.MEETING_SCHEDULE);
        registerRequired(policies, NotificationEventKey.MEETING_UPDATED, NotificationCategory.MEETING_SCHEDULE);
        registerRequired(policies, NotificationEventKey.MEETING_CANCELLED, NotificationCategory.MEETING_SCHEDULE);
        registerOptional(policies, NotificationEventKey.MEETING_REMINDER, NotificationCategory.MEETING_REMINDER);

        registerRequired(policies, NotificationEventKey.PIP_CREATED, NotificationCategory.PIP_STATUS);
        registerRequired(policies, NotificationEventKey.PIP_PHASE_UPDATED, NotificationCategory.PIP_STATUS);
        registerRequired(policies, NotificationEventKey.PIP_ENDED, NotificationCategory.PIP_STATUS);
        registerOptional(policies, NotificationEventKey.PIP_CREATOR_CONFIRMATION, NotificationCategory.PIP_CONFIRMATION);

        registerRequired(policies, NotificationEventKey.TEAM_CREATED, NotificationCategory.TEAM_STRUCTURE);
        registerRequired(policies, NotificationEventKey.TEAM_STRUCTURE_CHANGED, NotificationCategory.TEAM_STRUCTURE);
        registerRequired(policies, NotificationEventKey.TEAM_MEMBER_ADDED, NotificationCategory.TEAM_STRUCTURE);
        registerRequired(policies, NotificationEventKey.TEAM_MEMBER_REMOVED, NotificationCategory.TEAM_STRUCTURE);
        registerRequired(policies, NotificationEventKey.TEAM_LEADER_CHANGED, NotificationCategory.TEAM_STRUCTURE);
        registerRequired(policies, NotificationEventKey.PROJECT_MANAGER_CHANGED, NotificationCategory.TEAM_STRUCTURE);
        registerOptional(policies, NotificationEventKey.TEAM_ANNOUNCEMENT, NotificationCategory.TEAM_ANNOUNCEMENT);

        registerRequired(policies, NotificationEventKey.POSITION_DEPARTMENT_CHANGED, NotificationCategory.WORKFORCE_CHANGE);

        registerOptional(policies, NotificationEventKey.HR_ANNOUNCEMENT_NORMAL, NotificationCategory.HR_ANNOUNCEMENT);
        registerRequired(policies, NotificationEventKey.HR_ANNOUNCEMENT_IMPORTANT, NotificationCategory.HR_ANNOUNCEMENT);

        eventPolicies = Collections.unmodifiableMap(policies);
        settingDefinitions = Collections.unmodifiableMap(buildSettingDefinitions());
    }

    public NotificationDeliveryPolicy resolve(String eventKey, String legacyType) {
        String normalizedEventKey = normalize(eventKey);
        if (normalizedEventKey != null && eventPolicies.containsKey(normalizedEventKey)) {
            return eventPolicies.get(normalizedEventKey);
        }

        return legacyPolicyForType(legacyType);
    }

    public Optional<NotificationSettingDefinition> findSettingDefinition(String category) {
        String normalizedCategory = normalize(category);
        if (normalizedCategory == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(settingDefinitions.get(normalizedCategory));
    }

    public List<NotificationSettingDefinition> getSettingDefinitions() {
        return settingDefinitions.values()
                .stream()
                .sorted(Comparator.comparingInt(NotificationSettingDefinition::getDisplayOrder))
                .toList();
    }

    private NotificationDeliveryPolicy legacyPolicyForType(String legacyType) {
        String type = normalize(legacyType);

        if (type == null) {
            return NotificationDeliveryPolicy.required(null, NotificationCategory.GENERAL);
        }

        if (type.startsWith("KPI") || type.contains("KPI")) {
            return NotificationDeliveryPolicy.required(null, NotificationCategory.KPI_WORKFLOW);
        }

        if (type.contains("APPRAISAL")) {
            return NotificationDeliveryPolicy.required(null, NotificationCategory.APPRAISAL_WORKFLOW);
        }

        if (type.contains("FEEDBACK")) {
            return NotificationDeliveryPolicy.required(null, NotificationCategory.FEEDBACK_360_WORKFLOW);
        }

        if (type.contains("PIP")) {
            return NotificationDeliveryPolicy.required(null, NotificationCategory.PIP_STATUS);
        }

        if (type.contains("MEETING")) {
            return NotificationDeliveryPolicy.required(null, NotificationCategory.MEETING_SCHEDULE);
        }

        return NotificationDeliveryPolicy.required(null, NotificationCategory.GENERAL);
    }

    private Map<String, NotificationSettingDefinition> buildSettingDefinitions() {
        List<NotificationSettingDefinition> definitions = new ArrayList<>();

        definitions.add(definition(NotificationCategory.KPI_WORKFLOW, "KPI workflow", "KPI tasks, approvals, deadlines, and official KPI results.", true, 10));
        definitions.add(definition(NotificationCategory.APPRAISAL_WORKFLOW, "Appraisal workflow", "Appraisal tasks, reviews, deadlines, and published appraisal results.", true, 20));
        definitions.add(definition(NotificationCategory.FEEDBACK_360_WORKFLOW, "360 feedback workflow", "360 feedback assignments, reminders, approvals, and published summaries.", true, 30));
        definitions.add(definition(NotificationCategory.PIP_STATUS, "PIP status updates", "Official PIP creation, phase changes, and completion updates.", true, 40));
        definitions.add(definition(NotificationCategory.WORKFORCE_CHANGE, "Position and department changes", "Official position, department, and reporting changes that affect access and workflow routing.", true, 50));
        definitions.add(definition(NotificationCategory.MEETING_SCHEDULE, "Meeting schedule changes", "New, updated, or cancelled one-on-one meetings.", true, 60));
        definitions.add(definition(NotificationCategory.TEAM_STRUCTURE, "Team structure changes", "Team membership, leader, and project manager changes.", true, 70));
        definitions.add(definition(NotificationCategory.GENERAL, "Required system notices", "System notices that are not yet mapped to a detailed category.", true, 80));

        definitions.add(definition(NotificationCategory.CONTINUOUS_FEEDBACK, "Continuous feedback", "Feedback messages shared outside formal 360 campaigns.", false, 110));
        definitions.add(definition(NotificationCategory.MEETING_REMINDER, "Meeting reminders", "Reminder alerts before scheduled one-on-one meetings.", false, 120));
        definitions.add(definition(NotificationCategory.HR_ANNOUNCEMENT, "General HR announcements", "Normal HR announcements and non-critical HR notices.", false, 130));
        definitions.add(definition(NotificationCategory.KPI_SUMMARY, "KPI summary updates", "Summary-style KPI updates that do not require immediate action.", false, 140));
        definitions.add(definition(NotificationCategory.PIP_CONFIRMATION, "PIP self-confirmations", "Confirmation messages for PIP actions you already completed.", false, 150));
        definitions.add(definition(NotificationCategory.TEAM_ANNOUNCEMENT, "General team announcements", "Non-critical team announcements and FYI updates.", false, 160));

        Map<String, NotificationSettingDefinition> map = new LinkedHashMap<>();
        for (NotificationSettingDefinition definition : definitions) {
            map.put(definition.getCategory(), definition);
        }
        return map;
    }

    private NotificationSettingDefinition definition(String category, String label, String description, boolean locked, int displayOrder) {
        return NotificationSettingDefinition.builder()
                .category(category)
                .label(label)
                .description(description)
                .locked(locked)
                .defaultEnabled(true)
                .displayOrder(displayOrder)
                .build();
    }

    private void registerRequired(Map<String, NotificationDeliveryPolicy> policies, String eventKey, String category) {
        policies.put(eventKey, NotificationDeliveryPolicy.required(eventKey, category));
    }

    private void registerOptional(Map<String, NotificationDeliveryPolicy> policies, String eventKey, String category) {
        policies.put(eventKey, NotificationDeliveryPolicy.optional(eventKey, category));
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toUpperCase(Locale.ROOT);
    }
}
