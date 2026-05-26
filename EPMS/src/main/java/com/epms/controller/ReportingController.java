package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.dto.ReportingDtos.ReportingDashboardResponse;
import com.epms.service.ReportingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportingController {

    private final ReportingService reportingService;

    @GetMapping("/dashboard")
    public ResponseEntity<GenericApiResponse<ReportingDashboardResponse>> getDashboard() {
        return ResponseEntity.ok(
                GenericApiResponse.success("Reporting dashboard fetched", reportingService.getDashboard())
        );
    }
}