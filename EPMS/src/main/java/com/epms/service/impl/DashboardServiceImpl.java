package com.epms.service.impl;

import com.epms.dto.DashboardSummaryResponse;
import com.epms.entity.KpiForm;
import com.epms.entity.Notification;
import com.epms.entity.User;
import com.epms.repository.KpiFormRepository;
import com.epms.repository.NotificationRepository;
import com.epms.repository.PipRepository;
import com.epms.repository.UserRepository;
import com.epms.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final KpiFormRepository kpiFormRepository;
    private final PipRepository pipRepository;

    @Override
    @Transactional(readOnly = true)  // Modified by KHN - required for lazy Position fetch
    public DashboardSummaryResponse getDashboardSummary(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));

        long directReports = user.getDepartmentId() != null
                ? userRepository.countByDepartmentId(user.getDepartmentId())
                : 0;

        long unreadNotifications = notificationRepository.countByUser_IdAndIsReadFalse(user.getId());
        long kpisCreated = kpiFormRepository.countByCreatedByUser_Id(user.getId());
        long activePipsManaged = pipRepository.count();

        List<DashboardSummaryResponse.NotificationItem> recentNotifications =
                notificationRepository.findByUser_Id(user.getId(), PageRequest.of(0, 5))
                        .stream()
                        .map(this::mapNotification)
                        .toList();

        List<DashboardSummaryResponse.KpiItem> recentKpis =
                kpiFormRepository.findTop5ByOrderByCreatedAtDesc().stream()
                        .map(this::mapKpiTemplate)
                        .toList();

        return DashboardSummaryResponse.builder()
                .user(DashboardSummaryResponse.UserSnapshot.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .fullName(user.getFullName())
                        .employeeCode(user.getEmployeeCode())
                        // Modified by KHN
                        .position(user.getPosition() != null ? user.getPosition().getPositionTitle() : null)
                        // END HERE
                        .managerId(user.getManagerId())
                        .departmentId(user.getDepartmentId())
                        .active(Boolean.TRUE.equals(user.getActive()))
                        .joinDate(user.getJoinDate() != null ? user.getJoinDate().getTime() : null)
                        .build())
                .stats(DashboardSummaryResponse.Stats.builder()
                        .directReports(directReports)
                        .unreadNotifications(unreadNotifications)
                        .feedbackFormsCreated(0)
                        .openFeedbackRequests(0)
                        .kpisCreated(kpisCreated)
                        .activePipsManaged(activePipsManaged)
                        .build())
                .recentNotifications(recentNotifications)
                .recentFeedbackRequests(List.of())
                .recentKpis(recentKpis)
                .generatedAt(new Date().getTime())
                .build();
    }

    private DashboardSummaryResponse.NotificationItem mapNotification(Notification notification) {
        return DashboardSummaryResponse.NotificationItem.builder()
                .id(notification.getId())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .type(notification.getType())
                .read(notification.getIsRead())
                .createdAt(notification.getCreatedAt() != null ? notification.getCreatedAt().getTime() : null)
                .build();
    }

    private DashboardSummaryResponse.KpiItem mapKpiTemplate(KpiForm form) {
        Long createdMillis = null;
        if (form.getCreatedAt() != null) {
            createdMillis = form.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        }
        return DashboardSummaryResponse.KpiItem.builder()
                .id(form.getId())
                .title(form.getTitle())
                .target(null)
                .weight(form.getTotalWeight())
                .createdAt(createdMillis)
                .build();
    }
}
