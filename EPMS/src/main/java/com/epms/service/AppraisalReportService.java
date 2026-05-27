package com.epms.service;

public interface AppraisalReportService {
    byte[] generateEmployeeAppraisalPdf(Integer formId);

    String buildEmployeeAppraisalPdfFilename(Integer formId);
}
