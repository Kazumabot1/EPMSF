package com.epms.service.impl;

import com.epms.dto.notification.NotificationSettingResponseDto;
import com.epms.dto.notification.NotificationSettingsUpdateRequestDto;
import com.epms.entity.User;
import com.epms.entity.UserNotificationPreference;
import com.epms.notification.NotificationDeliveryPolicy;
import com.epms.notification.NotificationPolicyRegistry;
import com.epms.notification.NotificationSettingDefinition;
import com.epms.repository.UserNotificationPreferenceRepository;
import com.epms.repository.UserRepository;
import com.epms.service.NotificationPreferenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationPreferenceServiceImpl implements NotificationPreferenceService {

    private static final String LOCK_REASON = "Required for workflow safety";

    private final UserNotificationPreferenceRepository preferenceRepository;
    private final UserRepository userRepository;
    private final NotificationPolicyRegistry policyRegistry;

    @Override
    @Transactional(readOnly = true)
    public List<NotificationSettingResponseDto> getMySettings(Integer userId) {
        Map<String, UserNotificationPreference> categoryPreferences = preferenceRepository.findByUser_Id(userId)
                .stream()
                .filter(preference -> UserNotificationPreference.CATEGORY_SCOPE_EVENT_KEY.equals(preference.getEventKey()))
                .collect(Collectors.toMap(
                        preference -> normalize(preference.getCategory()),
                        Function.identity(),
                        (first, ignored) -> first
                ));

        return policyRegistry.getSettingDefinitions()
                .stream()
                .map(definition -> toResponse(definition, categoryPreferences.get(definition.getCategory())))
                .toList();
    }

    @Override
    @Transactional
    public List<NotificationSettingResponseDto> updateMySettings(Integer userId, NotificationSettingsUpdateRequestDto request) {
        if (request == null || request.getSettings() == null || request.getSettings().isEmpty()) {
            throw new IllegalArgumentException("At least one notification setting is required.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        for (NotificationSettingsUpdateRequestDto.Item item : request.getSettings()) {
            String category = normalize(item.getCategory());
            if (category == null) {
                throw new IllegalArgumentException("Notification category is required.");
            }

            NotificationSettingDefinition definition = policyRegistry.findSettingDefinition(category)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown notification category: " + category));

            boolean enabled = item.getEnabled() == null || item.getEnabled();

            if (definition.isLocked()) {
                if (!enabled) {
                    throw new IllegalArgumentException(definition.getLabel() + " cannot be turned off because it is required for workflow safety.");
                }
                continue;
            }

            UserNotificationPreference preference = preferenceRepository
                    .findByUser_IdAndCategoryAndEventKey(
                            userId,
                            category,
                            UserNotificationPreference.CATEGORY_SCOPE_EVENT_KEY
                    )
                    .orElseGet(() -> {
                        UserNotificationPreference created = new UserNotificationPreference();
                        created.setUser(user);
                        created.setCategory(category);
                        created.setEventKey(UserNotificationPreference.CATEGORY_SCOPE_EVENT_KEY);
                        created.setEmailEnabled(true);
                        return created;
                    });

            preference.setInAppEnabled(enabled);
            preferenceRepository.save(preference);
        }

        return getMySettings(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isInAppEnabled(Integer userId, NotificationDeliveryPolicy policy) {
        if (policy == null) {
            return true;
        }

        if (policy.isMandatory()) {
            return true;
        }

        String category = normalize(policy.getCategory());
        if (category == null) {
            return true;
        }

        String eventKey = normalize(policy.getEventKey());
        if (eventKey != null) {
            Optional<UserNotificationPreference> exactPreference = preferenceRepository
                    .findByUser_IdAndCategoryAndEventKey(userId, category, eventKey);
            if (exactPreference.isPresent()) {
                return Boolean.TRUE.equals(exactPreference.get().getInAppEnabled());
            }
        }

        return preferenceRepository
                .findByUser_IdAndCategoryAndEventKey(
                        userId,
                        category,
                        UserNotificationPreference.CATEGORY_SCOPE_EVENT_KEY
                )
                .map(UserNotificationPreference::getInAppEnabled)
                .orElse(policy.isDefaultInAppEnabled());
    }

    private NotificationSettingResponseDto toResponse(
            NotificationSettingDefinition definition,
            UserNotificationPreference preference
    ) {
        boolean enabled;
        if (definition.isLocked()) {
            enabled = true;
        } else if (preference == null) {
            enabled = definition.isDefaultEnabled();
        } else {
            enabled = Boolean.TRUE.equals(preference.getInAppEnabled());
        }

        return NotificationSettingResponseDto.builder()
                .category(definition.getCategory())
                .label(definition.getLabel())
                .description(definition.getDescription())
                .enabled(enabled)
                .locked(definition.isLocked())
                .defaultEnabled(definition.isDefaultEnabled())
                .lockReason(definition.isLocked() ? LOCK_REASON : null)
                .displayOrder(definition.getDisplayOrder())
                .build();
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toUpperCase(Locale.ROOT);
    }
}
