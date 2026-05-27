package com.epms.service;

public interface EmployeeAssessmentReportService {
    byte[] generateSelfAssessmentPdf(Long assessmentId);

    String buildSelfAssessmentPdfFilename(Long assessmentId);
}
