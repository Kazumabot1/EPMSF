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

    @GetMapping("/summary")
    @PreAuthorize("hasAnyAuthority('ROLE_HR','ROLE_ADMIN','HR','ADMIN')")
    public ResponseEntity<DashboardSummaryResponse> getDashboardSummary() {
        String email = SecurityUtils.currentUser().getUsername();
        return ResponseEntity.ok(dashboardService.getDashboardSummary(email));
    }
}