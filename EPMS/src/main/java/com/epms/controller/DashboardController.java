package com.epms.controller;

import com.epms.dto.DashboardSummaryResponse;
import com.epms.security.SecurityUtils;
import com.epms.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    /**
     * HR UI can be applied via {@code DashboardResolver} using position/title (e.g. contains "HR")
     * even when the user's formal role list does not include {@code ROLE_HR}. Align authorization
     * with that resolver so the SPA does not get 403 while showing the HR dashboard shell.
     */
    @GetMapping("/summary")
    @PreAuthorize(
            "hasAnyRole('HR', 'ADMIN') "
                    + "or principal.dashboard == 'HR_DASHBOARD' "
                    + "or principal.dashboard == 'ADMIN_DASHBOARD'"
    )
    public ResponseEntity<DashboardSummaryResponse> getDashboardSummary() {
        String email = SecurityUtils.currentUser().getUsername();
        return ResponseEntity.ok(dashboardService.getDashboardSummary(email));
    }
}