package com.epms.service;

import com.epms.dto.FeedbackDashboardResponse;

import java.util.List;

public interface FeedbackDashboardService {
    FeedbackDashboardResponse getEmployeeDashboard(Long userId, List<String> roles);
    FeedbackDashboardResponse getManagerDashboard(Long userId, List<String> roles);
    FeedbackDashboardResponse getHrDashboard(Long userId, List<String> roles);
}
