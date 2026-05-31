package com.epms.service;

import com.epms.entity.Employee;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackSummary;
import com.epms.entity.User;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.notification.NotificationEventKey;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.UserRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class FeedbackOperationalService {

    public static final String NOTIFICATION_TYPE = "FEEDBACK";
    public static final String ENTITY_CAMPAIGN = "FEEDBACK_CAMPAIGN";
    public static final String ENTITY_FORM = "FEEDBACK_FORM";
    public static final String ENTITY_RESPONSE = "FEEDBACK_RESPONSE";
    public static final String ENTITY_ASSIGNMENT = "FEEDBACK_ASSIGNMENT";

    public static final String FORM_CREATED = "FEEDBACK_FORM_CREATED";
    public static final String FORM_UPDATED = "FEEDBACK_FORM_UPDATED";
    public static final String CAMPAIGN_CREATED = "FEEDBACK_CAMPAIGN_CREATED";
    public static final String CAMPAIGN_UPDATED = "FEEDBACK_CAMPAIGN_UPDATED";
    public static final String CAMPAIGN_READY_TO_ACTIVATE = "FEEDBACK_CAMPAIGN_READY_TO_ACTIVATE";
    public static final String CAMPAIGN_ACTIVATED = "FEEDBACK_CAMPAIGN_ACTIVATED";
    public static final String CAMPAIGN_CLOSED = "FEEDBACK_CAMPAIGN_CLOSED";
    public static final String CAMPAIGN_PUBLISHED = "FEEDBACK_CAMPAIGN_PUBLISHED";
    public static final String CAMPAIGN_DELETED = "FEEDBACK_CAMPAIGN_DELETED";
    public static final String CAMPAIGN_EARLY_CLOSE_REQUESTED = "FEEDBACK_CAMPAIGN_EARLY_CLOSE_REQUESTED";
    public static final String CAMPAIGN_EARLY_CLOSE_APPROVED = "FEEDBACK_CAMPAIGN_EARLY_CLOSE_APPROVED";
    public static final String CAMPAIGN_EARLY_CLOSE_REJECTED = "FEEDBACK_CAMPAIGN_EARLY_CLOSE_REJECTED";
    public static final String TARGETS_UPDATED = "FEEDBACK_TARGETS_UPDATED";
    public static final String ASSIGNMENTS_GENERATED = "FEEDBACK_ASSIGNMENTS_GENERATED";
    public static final String ASSIGNMENT_MANUAL_ADDED = "FEEDBACK_ASSIGNMENT_MANUAL_ADDED";
    public static final String ASSIGNMENT_REMOVED = "FEEDBACK_ASSIGNMENT_REMOVED";
    public static final String DRAFT_SAVED = "FEEDBACK_DRAFT_SAVED";
    public static final String DRAFT_AUTO_SUBMITTED_ON_CLOSE = "FEEDBACK_DRAFT_AUTO_SUBMITTED_ON_CLOSE";
    public static final String SUBMITTED = "FEEDBACK_SUBMITTED";
    public static final String SUMMARY_CALCULATED = "FEEDBACK_SUMMARY_CALCULATED";
    public static final String SUMMARY_PUBLISHED = "FEEDBACK_SUMMARY_PUBLISHED";
    public static final String SUMMARY_UNPUBLISHED = "FEEDBACK_SUMMARY_UNPUBLISHED";
    public static final String DEADLINE_REMINDERS_SENT = "FEEDBACK_DEADLINE_REMINDERS_SENT";
    public static final String OVERDUE_REMINDERS_SENT = "FEEDBACK_OVERDUE_REMINDERS_SENT";

    private static final DateTimeFormatter DEADLINE_FORMATTER = DateTimeFormatter.ofPattern("MMM dd, yyyy HH:mm");

    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;

    public void audit(Long actorUserId, String action, String entityType, Long entityId, String oldValue, String newValue, String reason) {
        auditLogService.log(
                actorUserId != null ? actorUserId.intValue() : null,
                action,
                entityType,
                entityId != null ? entityId.intValue() : null,
                oldValue,
                newValue,
                reason
        );
    }

    public void audit(Integer actorUserId, String action, String entityType, Long entityId, String oldValue, String newValue, String reason) {
        audit(actorUserId != null ? actorUserId.longValue() : null, action, entityType, entityId, oldValue, newValue, reason);
    }

    @Transactional
    public NotificationDeliveryResult notifyCampaignActivated(FeedbackCampaign campaign) {
        List<FeedbackEvaluatorAssignment> assignments = assignmentRepository.findByCampaignIdWithRequest(campaign.getId()).stream()
                .filter(this::isPendingEvaluatorAssignment)
                .toList();

        int sent = 0;
        int skipped = 0;
        List<String> warnings = new ArrayList<>();
        Set<Integer> notifiedUsers = new LinkedHashSet<>();

        for (FeedbackEvaluatorAssignment assignment : assignments) {
            Optional<User> maybeUser = findActiveUserByEmployeeId(assignment.getEvaluatorEmployeeId());
            if (maybeUser.isEmpty()) {
                skipped++;
                warnings.add("No active user account found for evaluator employee ID " + assignment.getEvaluatorEmployeeId() + ".");
                continue;
            }

            User user = maybeUser.get();
            String targetName = employeeName(assignment.getFeedbackRequest().getTargetEmployeeId());
            String relationship = relationshipLabel(assignment);
            String message = "You have been assigned to give " + relationship + " feedback for " + targetName
                    + " in " + campaign.getName() + ". Deadline: " + formatDeadline(campaign.getEndAt()) + ".";

            if (notificationService.sendEventOnce(
                    user.getId(),
                    NotificationEventKey.FEEDBACK_360_TASK_ASSIGNED,
                    "360 feedback task assigned",
                    message,
                    NOTIFICATION_TYPE
            )) {
                sent++;
                notifiedUsers.add(user.getId());
            }
        }

        return NotificationDeliveryResult.builder()
                .candidateCount(assignments.size())
                .sentCount(sent)
                .skippedCount(skipped)
                .uniqueUserCount(notifiedUsers.size())
                .warnings(warnings)
                .build();
    }

    @Transactional
    public NotificationDeliveryResult notifyPendingEvaluatorReminders(FeedbackCampaign campaign, FeedbackReminderKind kind) {
        List<FeedbackEvaluatorAssignment> assignments = assignmentRepository.findByCampaignIdWithRequest(campaign.getId()).stream()
                .filter(this::isPendingEvaluatorAssignment)
                .toList();
        return notifyEvaluatorReminders(campaign, assignments, kind);
    }

    @Transactional
    public NotificationDeliveryResult notifyEvaluatorReminders(
            FeedbackCampaign campaign,
            List<FeedbackEvaluatorAssignment> assignments,
            FeedbackReminderKind kind
    ) {
        List<FeedbackEvaluatorAssignment> reminderCandidates = assignments == null ? List.of() : assignments.stream()
                                                                                                 .filter(this::isPendingEvaluatorAssignment)
                                                                                                 .toList();

        int sent = 0;
        int skipped = 0;
        List<String> warnings = new ArrayList<>();
        Set<Integer> notifiedUsers = new LinkedHashSet<>();

        for (FeedbackEvaluatorAssignment assignment : reminderCandidates) {
            Optional<User> maybeUser = findActiveUserByEmployeeId(assignment.getEvaluatorEmployeeId());
            if (maybeUser.isEmpty()) {
                skipped++;
                warnings.add("No active user account found for evaluator employee ID " + assignment.getEvaluatorEmployeeId() + ".");
                continue;
            }

            User user = maybeUser.get();
            String title = kind == FeedbackReminderKind.OVERDUE
                    ? "360 feedback is overdue"
                    : "360 feedback deadline reminder";
            String message = buildReminderMessage(campaign, assignment, kind);

            if (notificationService.sendEventOnce(
                    user.getId(),
                    kind == FeedbackReminderKind.OVERDUE
                            ? NotificationEventKey.FEEDBACK_360_OVERDUE_REMINDER
                            : NotificationEventKey.FEEDBACK_360_DEADLINE_REMINDER,
                    title,
                    message,
                    NOTIFICATION_TYPE
            )) {
                sent++;
                notifiedUsers.add(user.getId());
            } else {
                skipped++;
            }
        }

        return NotificationDeliveryResult.builder()
                .candidateCount(reminderCandidates.size())
                .sentCount(sent)
                .skippedCount(skipped)
                .uniqueUserCount(notifiedUsers.size())
                .warnings(warnings)
                .build();
    }

    @Transactional
    public NotificationDeliveryResult notifySummaryPublished(FeedbackCampaign campaign, List<FeedbackSummary> summaries) {
        int sent = 0;
        int skipped = 0;
        List<String> warnings = new ArrayList<>();
        Set<Integer> notifiedUsers = new LinkedHashSet<>();

        for (FeedbackSummary summary : summaries) {
            if (summary.getTotalResponses() == null || summary.getTotalResponses() <= 0) {
                continue;
            }
            Optional<User> maybeUser = findActiveUserByEmployeeId(summary.getTargetEmployeeId());
            if (maybeUser.isEmpty()) {
                skipped++;
                warnings.add("No active user account found for target employee ID " + summary.getTargetEmployeeId() + ".");
                continue;
            }

            User user = maybeUser.get();
            String message = "Your 360 feedback summary for " + campaign.getName()
                    + " is now available. Open your feedback dashboard to review the published results.";
            if (notificationService.sendEventOnce(
                    user.getId(),
                    NotificationEventKey.FEEDBACK_360_SUMMARY_PUBLISHED,
                    "Your 360 feedback summary is now available",
                    message,
                    NOTIFICATION_TYPE
            )) {
                sent++;
                notifiedUsers.add(user.getId());
            }
        }

        return NotificationDeliveryResult.builder()
                .candidateCount(summaries.size())
                .sentCount(sent)
                .skippedCount(skipped)
                .uniqueUserCount(notifiedUsers.size())
                .warnings(warnings)
                .build();
    }


    @Transactional
    public boolean notifyDraftAutoSubmittedOnClose(FeedbackCampaign campaign, FeedbackEvaluatorAssignment assignment) {
        Optional<User> maybeUser = findActiveUserByEmployeeId(assignment.getEvaluatorEmployeeId());
        if (maybeUser.isEmpty()) {
            return false;
        }

        User user = maybeUser.get();
        String targetName = employeeName(assignment.getFeedbackRequest().getTargetEmployeeId());
        String relationship = relationshipLabel(assignment);
        String message = "A completed draft for " + relationship + " feedback about " + targetName
                + " in " + campaign.getName()
                + " was automatically submitted when the campaign reached its scheduled deadline. The response is now final and read-only.";
        return notificationService.sendEventOnce(
                user.getId(),
                NotificationEventKey.FEEDBACK_360_DRAFT_AUTO_SUBMITTED,
                "Completed 360 feedback draft auto-submitted",
                message,
                NOTIFICATION_TYPE
        );
    }

    @Transactional
    public NotificationDeliveryResult notifyEarlyCloseRequested(FeedbackCampaign campaign, long totalAssignments, long submittedAssignments) {
        List<User> admins = userRepository.findActiveUsersByNormalizedRoleNames(List.of("HRADMIN", "SUPER_ADMIN"));
        int sent = 0;
        for (User admin : admins) {
            String message = "HR requested early close for " + campaign.getName()
                    + ". Completion: " + submittedAssignments + "/" + totalAssignments
                    + " submitted. Review the campaign information and approve or reject the request.";
            if (notificationService.sendEventOnce(
                    admin.getId(),
                    NotificationEventKey.FEEDBACK_360_EARLY_CLOSE_REVIEW,
                    "360 feedback early close approval needed",
                    message,
                    NOTIFICATION_TYPE
            )) {
                sent++;
            }
        }
        return NotificationDeliveryResult.builder()
                .candidateCount(admins.size())
                .sentCount(sent)
                .skippedCount(0)
                .uniqueUserCount(sent)
                .warnings(List.of())
                .build();
    }

    @Transactional
    public boolean notifyEarlyCloseReviewed(FeedbackCampaign campaign, boolean approved) {
        Long requesterUserId = campaign.getEarlyCloseRequestedByUserId();
        if (requesterUserId == null) {
            return false;
        }
        String title = approved
                ? "360 feedback early close approved"
                : "360 feedback early close rejected";
        String message = approved
                ? "Your early close request for " + campaign.getName() + " was approved. The campaign is now closed."
                : "Your early close request for " + campaign.getName() + " was rejected. The campaign remains active until the scheduled deadline.";
        return notificationService.sendEventOnce(
                requesterUserId.intValue(),
                NotificationEventKey.FEEDBACK_360_EARLY_CLOSE_DECIDED,
                title,
                message,
                NOTIFICATION_TYPE
        );
    }

    private boolean isPendingEvaluatorAssignment(FeedbackEvaluatorAssignment assignment) {
        return assignment.getStatus() == AssignmentStatus.PENDING
                || assignment.getStatus() == AssignmentStatus.IN_PROGRESS;
    }

    private Optional<User> findActiveUserByEmployeeId(Long employeeId) {
        if (employeeId == null) {
            return Optional.empty();
        }
        return userRepository.findActiveByEmployeeId(employeeId.intValue());
    }

    private String buildReminderMessage(FeedbackCampaign campaign, FeedbackEvaluatorAssignment assignment, FeedbackReminderKind kind) {
        String targetName = employeeName(assignment.getFeedbackRequest().getTargetEmployeeId());
        String relationship = relationshipLabel(assignment);
        if (kind == FeedbackReminderKind.OVERDUE) {
            return "Your " + relationship + " feedback for " + targetName + " in " + campaign.getName()
                    + " is overdue. Please complete it as soon as possible.";
        }
        return "Reminder: please complete your " + relationship + " feedback for " + targetName
                + " in " + campaign.getName() + " before " + formatDeadline(campaign.getEndAt()) + ".";
    }

    private String relationshipLabel(FeedbackEvaluatorAssignment assignment) {
        if (assignment == null || assignment.getRelationshipType() == null) {
            return "360";
        }
        return assignment.getRelationshipType().name().toLowerCase().replace('_', ' ');
    }

    private String employeeName(Long employeeId) {
        if (employeeId == null) {
            return "Unknown employee";
        }
        return userRepository.findActiveByEmployeeId(employeeId.intValue())
                .map(this::displayUser)
                .or(() -> employeeRepository.findById(employeeId.intValue()).map(this::displayEmployee))
                .orElse("Employee #" + employeeId);
    }

    private String displayUser(User user) {
        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName().trim();
        }
        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            return user.getEmail().trim();
        }
        return "Employee #" + user.getEmployeeId();
    }

    private String displayEmployee(Employee employee) {
        String firstName = employee.getFirstName() == null ? "" : employee.getFirstName().trim();
        String lastName = employee.getLastName() == null ? "" : employee.getLastName().trim();
        String fullName = (firstName + " " + lastName).trim();
        return fullName.isBlank() ? "Employee #" + employee.getId() : fullName;
    }

    private String formatDeadline(LocalDateTime deadline) {
        return deadline == null ? "the campaign deadline" : deadline.format(DEADLINE_FORMATTER);
    }

    public enum FeedbackReminderKind {
        DEADLINE,
        OVERDUE
    }

    @Data
    @Builder
    public static class NotificationDeliveryResult {
        private int candidateCount;
        private int sentCount;
        private int skippedCount;
        private int uniqueUserCount;
        private List<String> warnings;
    }
}
