package com.epms.service.impl;

import com.epms.dto.EmailSendResult;
import com.epms.dto.NotificationTemplateDeliveryResultDto;
import com.epms.dto.NotificationTemplateRequestDto;
import com.epms.dto.NotificationTemplateResponseDto;
import com.epms.entity.Employee;
import com.epms.entity.NotificationTemplate;
import com.epms.entity.User;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.notification.NotificationEventKey;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.NotificationTemplateRepository;
import com.epms.repository.UserRepository;
import com.epms.service.NotificationService;
import com.epms.service.NotificationTemplateService;
import com.epms.service.OnboardingEmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class NotificationTemplateServiceImpl implements NotificationTemplateService {

    private final NotificationTemplateRepository notificationTemplateRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final NotificationService notificationService;
    private final OnboardingEmailService onboardingEmailService;

    @Override
    @Transactional
    public NotificationTemplateResponseDto createNotificationTemplate(NotificationTemplateRequestDto requestDto) {
        NotificationTemplate notificationTemplate = new NotificationTemplate();
        applyRequest(notificationTemplate, requestDto);

        NotificationTemplate savedNotificationTemplate = notificationTemplateRepository.save(notificationTemplate);
        return mapToResponseDto(savedNotificationTemplate);
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationTemplateResponseDto> getAllNotificationTemplates() {
        return notificationTemplateRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationTemplateResponseDto getNotificationTemplateById(Integer id) {
        NotificationTemplate notificationTemplate = getNotificationTemplateEntityById(id);
        return mapToResponseDto(notificationTemplate);
    }

    @Override
    @Transactional
    public NotificationTemplateResponseDto updateNotificationTemplate(Integer id, NotificationTemplateRequestDto requestDto) {
        NotificationTemplate existingNotificationTemplate = getNotificationTemplateEntityById(id);
        applyRequest(existingNotificationTemplate, requestDto);

        NotificationTemplate updatedNotificationTemplate = notificationTemplateRepository.save(existingNotificationTemplate);
        return mapToResponseDto(updatedNotificationTemplate);
    }

    @Override
    @Transactional
    public void deleteNotificationTemplate(Integer id) {
        NotificationTemplate existingNotificationTemplate = getNotificationTemplateEntityById(id);
        notificationTemplateRepository.delete(existingNotificationTemplate);
    }

    private NotificationTemplate getNotificationTemplateEntityById(Integer id) {
        return notificationTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("NotificationTemplate not found with id: " + id));
    }

    private void applyRequest(NotificationTemplate notificationTemplate, NotificationTemplateRequestDto requestDto) {
        Set<String> channels = normalizeChannels(requestDto.getChannels(), requestDto.getChannelType(), true);
        Set<String> targetRoles = normalizeTargetRoles(requestDto.getTargetRoles(), true);

        notificationTemplate.setChannelType(String.join(",", channels));
        notificationTemplate.setChannels(channels);
        notificationTemplate.setTargetRoles(targetRoles);
        notificationTemplate.setSubjectTemplate(requestDto.getSubjectTemplate().trim());
        notificationTemplate.setBodyTemplate(requestDto.getBodyTemplate().trim());
    }

    @Override
    @Transactional
    public NotificationTemplateDeliveryResultDto sendTemplateEmail(Integer id) {
        NotificationTemplate template = getNotificationTemplateEntityById(id);
        ensureTemplateSupportsChannel(template, "email");

        List<User> recipients = resolveRecipients(template.getTargetRoles());
        List<String> failures = new ArrayList<>();
        List<NotificationTemplateDeliveryResultDto.RecipientResult> recipientRows = new ArrayList<>();
        int sent = 0;
        int skipped = 0;

        Set<String> deliveredEmails = new LinkedHashSet<>();
        for (User recipient : recipients) {
            String email = resolveOnboardEmail(recipient);
            if (!StringUtils.hasText(email)) {
                skipped++;
                String failure = "missing email address";
                failures.add(displayRecipient(recipient) + ": " + failure);
                recipientRows.add(recipientResult(recipient, email, "skipped", failure));
                continue;
            }

            if (!deliveredEmails.add(email.toLowerCase(Locale.ROOT))) {
                skipped++;
                recipientRows.add(recipientResult(recipient, email, "skipped", "duplicate email recipient"));
                continue;
            }

            EmailSendResult result = onboardingEmailService.sendNotificationTemplateEmail(
                    email,
                    template.getSubjectTemplate(),
                    template.getBodyTemplate()
            );

            if (result.isSent()) {
                sent++;
                recipientRows.add(recipientResult(recipient, email, "sent", null));
            } else {
                skipped++;
                String failure = safeFailure(result.getSafeErrorDetail());
                failures.add(email + ": " + failure);
                recipientRows.add(recipientResult(recipient, email, "skipped", failure));
            }
        }

        return new NotificationTemplateDeliveryResultDto(
                "email",
                recipients.size(),
                sent,
                skipped,
                firstFailure(failures),
                failures,
                recipientRows
        );
    }

    @Override
    @Transactional
    public NotificationTemplateDeliveryResultDto sendTemplateInApp(Integer id) {
        NotificationTemplate template = getNotificationTemplateEntityById(id);
        ensureTemplateSupportsChannel(template, "in_app");

        List<User> recipients = resolveRecipients(template.getTargetRoles());
        List<String> failures = new ArrayList<>();
        List<NotificationTemplateDeliveryResultDto.RecipientResult> recipientRows = new ArrayList<>();
        int sent = 0;
        int skipped = 0;

        for (User recipient : recipients) {
            try {
                boolean delivered = notificationService.sendEvent(
                        recipient.getId(),
                        NotificationEventKey.HR_ANNOUNCEMENT_NORMAL,
                        template.getSubjectTemplate(),
                        template.getBodyTemplate(),
                        "GENERAL"
                );
                if (delivered) {
                    sent++;
                    recipientRows.add(recipientResult(recipient, resolveOnboardEmail(recipient), "sent", null));
                } else {
                    skipped++;
                    recipientRows.add(recipientResult(recipient, resolveOnboardEmail(recipient), "skipped", "disabled by notification settings"));
                }
            } catch (Exception ex) {
                skipped++;
                String failure = safeFailure(ex.getMessage());
                failures.add(displayRecipient(recipient) + ": " + failure);
                recipientRows.add(recipientResult(recipient, resolveOnboardEmail(recipient), "skipped", failure));
            }
        }

        return new NotificationTemplateDeliveryResultDto(
                "in_app",
                recipients.size(),
                sent,
                skipped,
                firstFailure(failures),
                failures,
                recipientRows
        );
    }

    private NotificationTemplateResponseDto mapToResponseDto(NotificationTemplate notificationTemplate) {
        Set<String> channels = normalizeChannels(
                notificationTemplate.getChannels(),
                notificationTemplate.getChannelType(),
                false
        );
        Set<String> targetRoles = normalizeTargetRoles(notificationTemplate.getTargetRoles(), false);

        return new NotificationTemplateResponseDto(
                notificationTemplate.getId(),
                notificationTemplate.getChannelType(),
                List.copyOf(channels),
                List.copyOf(targetRoles),
                resolveTargetEmails(targetRoles),
                notificationTemplate.getSubjectTemplate(),
                notificationTemplate.getBodyTemplate()
        );
    }

    private List<String> resolveTargetEmails(Collection<String> targetRoles) {
        return resolveRecipients(targetRoles).stream()
                .map(User::getEmail)
                .filter(StringUtils::hasText)
                .map(String::trim)
                .distinct()
                .toList();
    }

    private List<User> resolveRecipients(Collection<String> targetRoles) {
        if (targetRoles == null || targetRoles.isEmpty()) {
            return List.of();
        }

        Set<String> normalizedRoles = targetRoles.stream()
                .map(this::normalizeRoleForLookup)
                .filter(StringUtils::hasText)
                .collect(LinkedHashSet::new, Set::add, Set::addAll);

        if (normalizedRoles.isEmpty()) {
            return List.of();
        }

        return userRepository.findActiveUsersByNormalizedRoleNames(normalizedRoles)
                .stream()
                .filter(this::hasUsableEmployeeRecord)
                .toList();
    }

    private Set<String> normalizeChannels(Collection<String> rawChannels, String legacyChannelType, boolean required) {
        LinkedHashSet<String> channels = new LinkedHashSet<>();

        if (rawChannels != null) {
            rawChannels.forEach(channel -> {
                String normalized = normalizeChannel(channel);
                if (normalized != null) {
                    channels.add(normalized);
                }
            });
        }

        if (channels.isEmpty() && StringUtils.hasText(legacyChannelType)) {
            for (String channel : legacyChannelType.split(",")) {
                String normalized = normalizeChannel(channel);
                if (normalized != null) {
                    channels.add(normalized);
                }
            }
        }

        if (required && channels.isEmpty()) {
            throw new BadRequestException("At least one valid channel is required.");
        }

        return channels;
    }

    private String normalizeChannel(String channel) {
        if (!StringUtils.hasText(channel)) {
            return null;
        }

        String normalized = channel.trim().toLowerCase(Locale.ROOT).replace("-", "_");

        if (normalized.equals("system") || normalized.equals("app") || normalized.equals("inapp")) {
            return "in_app";
        }

        if (normalized.equals("email") || normalized.equals("in_app")) {
            return normalized;
        }

        return null;
    }

    private Set<String> normalizeTargetRoles(Collection<String> rawRoles, boolean required) {
        LinkedHashSet<String> targetRoles = new LinkedHashSet<>();

        if (rawRoles != null) {
            rawRoles.forEach(role -> {
                String normalized = normalizeRoleForDisplay(role);
                if (normalized != null) {
                    targetRoles.add(normalized);
                }
            });
        }

        if (required && targetRoles.isEmpty()) {
            throw new BadRequestException("At least one valid target role is required.");
        }

        return targetRoles;
    }

    private String normalizeRoleForDisplay(String role) {
        String normalized = normalizeRoleForLookup(role);
        return switch (normalized) {
            case "EMPLOYEE" -> "Employee";
            case "MANAGER", "PROJECT_MANAGER", "TEAM_MANAGER" -> "Manager";
            case "DEPARTMENT_HEAD", "DEPARTMENTHEAD", "DEPT_HEAD", "HEAD_OF_DEPARTMENT" -> "DepartmentHead";
            case "HR", "HUMAN_RESOURCE", "HUMAN_RESOURCES", "HR_MANAGER", "HR_ADMIN" -> "HR";
            case "ADMIN" -> "Admin";
            case "CEO", "EXECUTIVE" -> "Executive";
            default -> null;
        };
    }

    private String normalizeRoleForLookup(String role) {
        if (!StringUtils.hasText(role)) {
            return "";
        }

        return role
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("([a-z])([A-Z])", "$1_$2")
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase(Locale.ROOT);
    }

    private void ensureTemplateSupportsChannel(NotificationTemplate template, String channel) {
        Set<String> channels = normalizeChannels(template.getChannels(), template.getChannelType(), false);
        if (!channels.contains(channel)) {
            throw new BadRequestException("Template is not configured for " + channel + " delivery.");
        }
    }

    private boolean hasUsableEmployeeRecord(User user) {
        Optional<Employee> employee = resolveEmployee(user);

        return employee.map(value -> value.getActive() == null || Boolean.TRUE.equals(value.getActive()))
                .orElse(true);
    }

    private Optional<Employee> resolveEmployee(User user) {
        Optional<Employee> employee = Optional.empty();

        if (user.getEmployeeId() != null) {
            employee = employeeRepository.findById(user.getEmployeeId());
        }

        if (employee.isEmpty() && StringUtils.hasText(user.getEmail())) {
            employee = employeeRepository.findByEmail(user.getEmail().trim());
        }

        return employee;
    }

    private String resolveOnboardEmail(User user) {
        Optional<Employee> employee = resolveEmployee(user);

        if (employee.isPresent()) {
            Employee value = employee.get();
            if ((value.getActive() == null || Boolean.TRUE.equals(value.getActive()))
                    && StringUtils.hasText(value.getEmail())) {
                return value.getEmail().trim();
            }
        }

        return normalizeEmail(user.getEmail());
    }

    private String normalizeEmail(String email) {
        return StringUtils.hasText(email) ? email.trim() : null;
    }

    private String displayRecipient(User user) {
        if (StringUtils.hasText(user.getFullName())) {
            return user.getFullName().trim();
        }

        if (StringUtils.hasText(user.getEmail())) {
            return user.getEmail().trim();
        }

        return "User #" + user.getId();
    }

    private String safeFailure(String message) {
        return StringUtils.hasText(message) ? message.trim() : "Delivery failed";
    }

    private String firstFailure(List<String> failures) {
        return failures.isEmpty() ? null : failures.get(0);
    }

    private NotificationTemplateDeliveryResultDto.RecipientResult recipientResult(
            User user,
            String email,
            String status,
            String failure
    ) {
        return new NotificationTemplateDeliveryResultDto.RecipientResult(
                user.getId(),
                displayRecipient(user),
                resolveDisplayRole(user),
                email,
                status,
                failure
        );
    }

    private String resolveDisplayRole(User user) {
        if (user == null || user.getId() == null) {
            return null;
        }

        return userRepository.findAuditLogEditorOptionsByUserIds(List.of(user.getId()))
                .stream()
                .findFirst()
                .map(UserRepository.AuditLogEditorProjection::getRoleName)
                .orElse(null);
    }
}
