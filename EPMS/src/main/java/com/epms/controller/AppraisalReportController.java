package com.epms.controller;

import com.epms.service.AppraisalReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
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
@RequestMapping("/api/appraisal/reports")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AppraisalReportController {

    private final AppraisalReportService appraisalReportService;

    @GetMapping("/hr/forms/{formId}/pdf")
    @PreAuthorize(
            "hasAnyRole('HR', 'HRADMIN') "
                    + "or authentication.principal.dashboard == 'HR_DASHBOARD' "
                    + "or authentication.principal.dashboard == 'HRADMIN_DASHBOARD'"
    )
    public ResponseEntity<byte[]> exportEmployeeAppraisalPdf(@PathVariable Integer formId) {
        byte[] pdf = appraisalReportService.generateEmployeeAppraisalPdf(formId);
        String filename = appraisalReportService.buildEmployeeAppraisalPdfFilename(formId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.inline().filename(filename).build());
        headers.setContentLength(pdf.length);

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdf);
    }
}
