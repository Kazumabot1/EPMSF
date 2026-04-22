package com.epms.service.impl;

import com.epms.dto.DashboardSummaryResponse;
import com.epms.entity.Kpi;
import com.epms.entity.Notification;
import com.epms.entity.User;
import com.epms.repository.KpiRepository;
import com.epms.repository.NotificationRepository;
import com.epms.repository.PipRepository;
import com.epms.repository.UserRepository;
import com.epms.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final KpiRepository kpiRepository;
    private final PipRepository pipRepository;

    @Override
    public DashboardSummaryResponse getDashboardSummary(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));

        long directReports = user.getDepartmentId() != null
                ? userRepository.countByDepartmentId(user.getDepartmentId())
                : 0;

        long unreadNotifications = notificationRepository.countByUser_IdAndIsReadFalse(user.getId());
        long kpisCreated = kpiRepository.countByCreatedByUser_Id(user.getId());
        long activePipsManaged = pipRepository.count();

        List<DashboardSummaryResponse.NotificationItem> recentNotifications =
                notificationRepository.findByUser_Id(user.getId(), PageRequest.of(0, 5))
                        .stream()
                        .map(this::mapNotification)
                        .toList();

        List<DashboardSummaryResponse.KpiItem> recentKpis =
                kpiRepository.findAllBy().stream()
                        .limit(5)
                        .map(this::mapKpi)
                        .toList();

        return DashboardSummaryResponse.builder()
                .user(DashboardSummaryResponse.UserSnapshot.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .fullName(user.getFullName())
                        .employeeCode(user.getEmployeeCode())
                        .position(user.getPosition())
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

    private DashboardSummaryResponse.KpiItem mapKpi(Kpi kpi) {
        return DashboardSummaryResponse.KpiItem.builder()
                .id(kpi.getId())
                .title(kpi.getTitle())
                .target(kpi.getTarget())
                .weight(kpi.getWeight())
                .createdAt(kpi.getCreatedAt() != null ? kpi.getCreatedAt().getTime() : null)
                .build();
    }
}