package com.epms.controller;

import com.epms.service.EmployeeAssessmentReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/employee-assessments/reports")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class EmployeeAssessmentReportController {

    private final EmployeeAssessmentReportService employeeAssessmentReportService;

    @GetMapping("/{assessmentId}/pdf")
    @PreAuthorize(
            "hasAnyRole('HR', 'ADMIN') "
                    + "or authentication.principal.dashboard == 'HR_DASHBOARD' "
                    + "or authentication.principal.dashboard == 'ADMIN_DASHBOARD'"
    )
    public ResponseEntity<byte[]> exportSelfAssessmentPdf(@PathVariable Long assessmentId) {
        byte[] pdf = employeeAssessmentReportService.generateSelfAssessmentPdf(assessmentId);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentLength(pdf.length);

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdf);
    }
}
