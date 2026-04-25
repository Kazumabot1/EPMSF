package com.epms.controller;

import com.epms.dto.FeedbackDashboardResponse;
import com.epms.dto.GenericApiResponse;
import com.epms.exception.UnauthorizedActionException;
import com.epms.security.SecurityUtils;
import com.epms.service.FeedbackDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/feedback/dashboard")
@RequiredArgsConstructor
public class FeedbackDashboardController {

    private final FeedbackDashboardService feedbackDashboardService;

    @GetMapping("/employee")
    public ResponseEntity<GenericApiResponse<FeedbackDashboardResponse>> getEmployeeDashboard() {
        Long userId = SecurityUtils.currentUserId().longValue();
        return ResponseEntity.ok(GenericApiResponse.success(
                "Employee feedback dashboard retrieved successfully",
                feedbackDashboardService.getEmployeeDashboard(userId, SecurityUtils.currentUser().getRoles())
        ));
    }

    @GetMapping("/manager")
    public ResponseEntity<GenericApiResponse<FeedbackDashboardResponse>> getManagerDashboard() {
        ensureManagerOrAbove();
        Long userId = SecurityUtils.currentUserId().longValue();
        return ResponseEntity.ok(GenericApiResponse.success(
                "Manager feedback dashboard retrieved successfully",
                feedbackDashboardService.getManagerDashboard(userId, SecurityUtils.currentUser().getRoles())
        ));
    }

    @GetMapping("/hr")
    public ResponseEntity<GenericApiResponse<FeedbackDashboardResponse>> getHrDashboard() {
        ensureHrOrAdmin();
        Long userId = SecurityUtils.currentUserId().longValue();
        return ResponseEntity.ok(GenericApiResponse.success(
                "HR feedback dashboard retrieved successfully",
                feedbackDashboardService.getHrDashboard(userId, SecurityUtils.currentUser().getRoles())
        ));
    }

    private void ensureManagerOrAbove() {
        List<String> roles = SecurityUtils.currentUser().getRoles();
        boolean authorized = roles != null && roles.stream()
                .map(String::toUpperCase)
                .anyMatch(role -> role.equals("MANAGER") || role.equals("HR") || role.equals("ADMIN")
                        || role.equals("ROLE_MANAGER") || role.equals("ROLE_HR") || role.equals("ROLE_ADMIN"));
        if (!authorized) {
            throw new UnauthorizedActionException("Only Manager/HR/Admin can access manager dashboard.");
        }
    }

    private void ensureHrOrAdmin() {
        List<String> roles = SecurityUtils.currentUser().getRoles();
        boolean authorized = roles != null && roles.stream()
                .map(String::toUpperCase)
                .anyMatch(role -> role.equals("HR") || role.equals("ADMIN") || role.equals("ROLE_HR") || role.equals("ROLE_ADMIN"));
        if (!authorized) {
            throw new UnauthorizedActionException("Only HR/Admin can access HR dashboard.");
        }
    }
}
