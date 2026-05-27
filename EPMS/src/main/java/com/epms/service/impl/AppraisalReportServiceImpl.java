package com.epms.service.impl;

import com.epms.dto.appraisal.AppraisalCriterionResponse;
import com.epms.dto.appraisal.AppraisalReviewResponse;
import com.epms.dto.appraisal.AppraisalScoreBandResponse;
import com.epms.dto.appraisal.AppraisalSectionResponse;
import com.epms.dto.appraisal.EmployeeAppraisalFormResponse;
import com.epms.dto.report.AppraisalReportCriteriaRowDto;
import com.epms.dto.report.AppraisalReportDto;
import com.epms.dto.report.AppraisalReportScoreBandRowDto;
import com.epms.entity.enums.AppraisalReviewStage;
import com.epms.service.AppraisalReportService;
import com.epms.service.EmployeeAppraisalWorkflowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.sf.jasperreports.engine.JRException;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperExportManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.awt.Image;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AppraisalReportServiceImpl implements AppraisalReportService {

    private static final String REPORT_PATH = "reports/appraisal/performance_appraisal_form.jrxml";
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter DATE_TIME_FORMAT = DateTimeFormatter.ofPattern("d MMMM yyyy, HH:mm", Locale.ENGLISH);
    private static final SimpleDateFormat LEGACY_DATE_FORMAT = new SimpleDateFormat("d MMMM yyyy", Locale.ENGLISH);
    private static final SimpleDateFormat LEGACY_DATE_TIME_FORMAT = new SimpleDateFormat("d MMMM yyyy, HH:mm", Locale.ENGLISH);

    private final EmployeeAppraisalWorkflowService workflowService;

    @Override
    public byte[] generateEmployeeAppraisalPdf(Integer formId) {
        EmployeeAppraisalFormResponse form = workflowService.getForm(formId);
        AppraisalReportDto report = buildReport(form);

        try {
            return generateJasperPdf(report, formId);
        } catch (Throwable jasperError) {
            // Do not let a Jasper template/runtime issue break the HR export flow.
            // The detailed stack trace is still logged for fixing the template in the next design pass.
            log.error("Jasper employee appraisal PDF generation failed for formId={}. Falling back to a safe PDF layout.", formId, jasperError);
            try {
                return generateSafePdf(report);
            } catch (Throwable fallbackError) {
                log.error("Fallback employee appraisal PDF generation also failed for formId={}", formId, fallbackError);
                throw new IllegalStateException(
                        "Employee appraisal PDF report could not be generated. Jasper error: "
                                + rootMessage(jasperError)
                                + "; fallback error: "
                                + rootMessage(fallbackError),
                        fallbackError
                );
            }
        }
    }


    @Override
    public String buildEmployeeAppraisalPdfFilename(Integer formId) {
        EmployeeAppraisalFormResponse form = workflowService.getForm(formId);
        String employeePart = sanitizeFilenamePart(form.getEmployeeName());
        if (employeePart.isBlank()) {
            employeePart = "employee";
        }
        return "performance-appraisal-" + employeePart + "-" + formId + ".pdf";
    }

    private byte[] generateJasperPdf(AppraisalReportDto report, Integer formId) throws IOException, JRException {
        try (InputStream template = openReportTemplate()) {
            JasperReport jasperReport = JasperCompileManager.compileReport(template);
            JasperPrint jasperPrint = JasperFillManager.fillReport(
                    jasperReport,
                    buildParameters(report),
                    new JRBeanCollectionDataSource(report.getCriteriaRows())
            );
            return JasperExportManager.exportReportToPdf(jasperPrint);
        }
    }

    private byte[] generateSafePdf(AppraisalReportDto report) throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        com.lowagie.text.Document document = new com.lowagie.text.Document(
                com.lowagie.text.PageSize.A4,
                16,
                16,
                14,
                12
        );
        com.lowagie.text.pdf.PdfWriter.getInstance(document, output);
        document.open();

        com.lowagie.text.Font titleFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 12.5f, com.lowagie.text.Font.BOLD);
        com.lowagie.text.Font headerFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 7.4f, com.lowagie.text.Font.BOLD);
        com.lowagie.text.Font valueFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 6.7f, com.lowagie.text.Font.NORMAL);
        com.lowagie.text.Font smallFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 5.7f, com.lowagie.text.Font.NORMAL);
        com.lowagie.text.Font ratingFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 6.9f, com.lowagie.text.Font.BOLD);

        com.lowagie.text.pdf.PdfPTable titleBar = new com.lowagie.text.pdf.PdfPTable(1);
        titleBar.setWidthPercentage(100);
        com.lowagie.text.pdf.PdfPCell titleCell = pdfCell("Performance Appraisal Form", titleFont, 18, com.lowagie.text.Element.ALIGN_LEFT);
        titleCell.setBackgroundColor(new java.awt.Color(252, 228, 214));
        titleCell.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
        titleBar.addCell(titleCell);
        document.add(titleBar);

        addCenteredParagraph(document, "Performance Evaluation Form", headerFont, 8, 5);
        addCenteredParagraph(document, valueOrDash(report.getCompanyName()), headerFont, 8, 0);

        com.lowagie.text.pdf.PdfPTable info = new com.lowagie.text.pdf.PdfPTable(new float[]{168f, 377f});
        info.setWidthPercentage(100);
        info.setSpacingBefore(1);
        addInfoRow(info, "Employee Name :", report.getEmployeeName(), headerFont, valueFont, 9.5f);
        addInfoRow(info, "Employee ID :", report.getEmployeeCode(), headerFont, valueFont, 9.5f);
        addInfoRow(info, "Current Position :", report.getPositionName(), headerFont, valueFont, 9.5f);
        addInfoRow(info, "Department :", report.getDepartmentName(), headerFont, valueFont, 9.5f);
        addInfoRow(info, "Assessment Date :", report.getAssessmentDate(), headerFont, valueFont, 9.5f);
        addInfoRow(info, "Effective Date :", report.getEffectiveDate(), headerFont, valueFont, 9.5f);
        document.add(info);

        addLeftParagraph(document, "Evaluations", valueFont, 7, 4);

        com.lowagie.text.pdf.PdfPTable ratings = new com.lowagie.text.pdf.PdfPTable(new float[]{75f, 22f, 292f, 31f, 31f, 31f, 31f, 31f});
        ratings.setWidthPercentage(100);
        ratings.setSplitLate(false);
        ratings.setSplitRows(true);
        float headerHeight = 12f;
        addRatingHeader(ratings, "", headerFont, headerHeight);
        addRatingHeader(ratings, "", headerFont, headerHeight);
        addRatingHeader(ratings, "", headerFont, headerHeight);
        addRatingHeader(ratings, "1", headerFont, headerHeight);
        addRatingHeader(ratings, "2", headerFont, headerHeight);
        addRatingHeader(ratings, "3", headerFont, headerHeight);
        addRatingHeader(ratings, "4", headerFont, headerHeight);
        addRatingHeader(ratings, "5", headerFont, headerHeight);

        int rowCount = Math.max(report.getCriteriaRows().size(), 1);
        float rowHeight = rowCount > 30 ? 7.0f : rowCount > 24 ? 7.4f : 8.0f;
        int rowIndex = 0;
        while (rowIndex < report.getCriteriaRows().size()) {
            AppraisalReportCriteriaRowDto firstRow = report.getCriteriaRows().get(rowIndex);
            String sectionName = firstRow.getSectionName();
            int nextIndex = rowIndex + 1;
            while (nextIndex < report.getCriteriaRows().size()
                    && Objects.equals(sectionName, report.getCriteriaRows().get(nextIndex).getSectionName())) {
                nextIndex++;
            }
            int sectionSpan = nextIndex - rowIndex;
            for (int index = rowIndex; index < nextIndex; index++) {
                AppraisalReportCriteriaRowDto row = report.getCriteriaRows().get(index);
                if (index == rowIndex) {
                    addSectionSpanCell(ratings, sectionName, valueFont, rowHeight, sectionSpan);
                }
                addBodyCell(ratings, row.getCriteriaNumber(), valueFont, rowHeight, com.lowagie.text.Element.ALIGN_CENTER);
                addBodyCell(ratings, compactText(row.getCriteriaText(), 118), valueFont, rowHeight, com.lowagie.text.Element.ALIGN_LEFT);
                addRatingMarkCell(ratings, row.getRating1(), ratingFont, rowHeight);
                addRatingMarkCell(ratings, row.getRating2(), ratingFont, rowHeight);
                addRatingMarkCell(ratings, row.getRating3(), ratingFont, rowHeight);
                addRatingMarkCell(ratings, row.getRating4(), ratingFont, rowHeight);
                addRatingMarkCell(ratings, row.getRating5(), ratingFont, rowHeight);
            }
            rowIndex = nextIndex;
        }
        com.lowagie.text.pdf.PdfPCell totalLabel = pdfCell("Total Points", headerFont, 11, com.lowagie.text.Element.ALIGN_CENTER);
        totalLabel.setColspan(3);
        ratings.addCell(totalLabel);
        com.lowagie.text.pdf.PdfPCell totalValue = pdfCell(blankIfNull(report.getTotalPoints()), headerFont, 11, com.lowagie.text.Element.ALIGN_CENTER);
        totalValue.setColspan(5);
        ratings.addCell(totalValue);
        document.add(ratings);

        com.lowagie.text.pdf.PdfPTable formula = new com.lowagie.text.pdf.PdfPTable(new float[]{170f, 220f, 155f});
        formula.setWidthPercentage(100);
        formula.setSpacingBefore(5);
        addRatingHeader(formula, "Arial", headerFont, 12);
        addRatingHeader(formula, "Formula", headerFont, 12);
        addRatingHeader(formula, "Score", headerFont, 12);
        addBodyCell(formula, "Total Points", headerFont, 24, com.lowagie.text.Element.ALIGN_CENTER);
        addBodyCell(formula, "Total Point  X 100 / Number of Questions Answered X 5", smallFont, 24, com.lowagie.text.Element.ALIGN_CENTER);
        addBodyCell(formula, blankIfNull(report.getScorePercent()) + "  " + blankIfNull(report.getPerformanceLabel()), headerFont, 24, com.lowagie.text.Element.ALIGN_CENTER);
        document.add(formula);

        com.lowagie.text.pdf.PdfPTable scoreBands = new com.lowagie.text.pdf.PdfPTable(new float[]{63f, 130f, 352f});
        scoreBands.setWidthPercentage(100);
        scoreBands.setSpacingBefore(5);
        addRatingHeader(scoreBands, "Score", headerFont, 8.5f);
        addRatingHeader(scoreBands, "Rating", headerFont, 8.5f);
        addRatingHeader(scoreBands, "Description", headerFont, 8.5f);
        for (AppraisalReportScoreBandRowDto band : report.getScoreBandRows()) {
            addScoreBandRow(scoreBands, band, smallFont);
        }
        document.add(scoreBands);

        addOtherRemarks(document, report, valueFont);
        drawSignatureBlocks(document, report, valueFont);

        document.close();
        return output.toByteArray();
    }

    private void addCenteredParagraph(com.lowagie.text.Document document, String text, com.lowagie.text.Font font, float fixedLeading, float spacingBefore) throws com.lowagie.text.DocumentException {
        com.lowagie.text.Paragraph paragraph = new com.lowagie.text.Paragraph(text, font);
        paragraph.setAlignment(com.lowagie.text.Element.ALIGN_CENTER);
        paragraph.setLeading(fixedLeading);
        paragraph.setSpacingBefore(spacingBefore);
        document.add(paragraph);
    }

    private void addLeftParagraph(com.lowagie.text.Document document, String text, com.lowagie.text.Font font, float fixedLeading, float spacingBefore) throws com.lowagie.text.DocumentException {
        com.lowagie.text.Paragraph paragraph = new com.lowagie.text.Paragraph(text, font);
        paragraph.setAlignment(com.lowagie.text.Element.ALIGN_LEFT);
        paragraph.setLeading(fixedLeading);
        paragraph.setSpacingBefore(spacingBefore);
        document.add(paragraph);
    }

    private void addInfoRow(com.lowagie.text.pdf.PdfPTable table, String label, String value, com.lowagie.text.Font labelFont, com.lowagie.text.Font valueFont, float height) {
        table.addCell(pdfCell(label, labelFont, height, com.lowagie.text.Element.ALIGN_LEFT));
        table.addCell(pdfCell(blankIfNull(value), valueFont, height, com.lowagie.text.Element.ALIGN_LEFT));
    }

    private void addRatingHeader(com.lowagie.text.pdf.PdfPTable table, String text, com.lowagie.text.Font font, float height) {
        table.addCell(pdfCell(text, font, height, com.lowagie.text.Element.ALIGN_CENTER));
    }

    private void addBodyCell(com.lowagie.text.pdf.PdfPTable table, String text, com.lowagie.text.Font font, float height, int alignment) {
        table.addCell(pdfCell(blankIfNull(text), font, height, alignment));
    }


    private void addRatingMarkCell(com.lowagie.text.pdf.PdfPTable table, String mark, com.lowagie.text.Font font, float height) {
        com.lowagie.text.pdf.PdfPCell cell = pdfCell("", font, height, com.lowagie.text.Element.ALIGN_CENTER);
        if (mark != null && !mark.trim().isEmpty()) {
            cell.setCellEvent((pdfCell, position, canvases) -> {
                com.lowagie.text.pdf.PdfContentByte canvas = canvases[com.lowagie.text.pdf.PdfPTable.LINECANVAS];
                float centerX = (position.getLeft() + position.getRight()) / 2f;
                float centerY = (position.getBottom() + position.getTop()) / 2f;

                // Keep the rating tick compact and consistent even when a table row becomes taller.
                float x1 = centerX - 3.0f;
                float y1 = centerY + 0.1f;
                float x2 = centerX - 0.9f;
                float y2 = centerY - 2.1f;
                float x3 = centerX + 4.0f;
                float y3 = centerY + 3.2f;

                canvas.saveState();
                canvas.setColorStroke(java.awt.Color.BLACK);
                canvas.setLineWidth(0.65f);
                canvas.moveTo(x1, y1);
                canvas.lineTo(x2, y2);
                canvas.lineTo(x3, y3);
                canvas.stroke();
                canvas.restoreState();
            });
        }
        table.addCell(cell);
    }

    private void addScoreBandRow(com.lowagie.text.pdf.PdfPTable table, AppraisalReportScoreBandRowDto band, com.lowagie.text.Font font) {
        table.addCell(pdfCell(band.getScore(), font, 8.8f, com.lowagie.text.Element.ALIGN_CENTER));
        table.addCell(pdfCell(band.getLabel(), font, 8.8f, com.lowagie.text.Element.ALIGN_LEFT));
        table.addCell(pdfCell(band.getDescription(), font, 8.8f, com.lowagie.text.Element.ALIGN_LEFT));
    }

    private void addSectionSpanCell(
            com.lowagie.text.pdf.PdfPTable table,
            String sectionName,
            com.lowagie.text.Font font,
            float rowHeight,
            int rowSpan
    ) {
        com.lowagie.text.pdf.PdfPCell cell = pdfCell(blankIfNull(sectionName), font, rowHeight * Math.max(rowSpan, 1), com.lowagie.text.Element.ALIGN_CENTER);
        cell.setRowspan(Math.max(rowSpan, 1));
        cell.setRotation(90);
        cell.setPadding(1);
        table.addCell(cell);
    }

    private void addOtherRemarks(
            com.lowagie.text.Document document,
            AppraisalReportDto report,
            com.lowagie.text.Font font
    ) throws com.lowagie.text.DocumentException {
        String remarks = report.getOtherRemarksText() != null && !report.getOtherRemarksText().isBlank()
                ? compactMultiline(report.getOtherRemarksText(), 260)
                : "Appraiser's Comment for Discussion;";
        com.lowagie.text.Paragraph paragraph = new com.lowagie.text.Paragraph("Other remarks:\n" + remarks, font);
        paragraph.setLeading(7.2f);
        paragraph.setSpacingBefore(5);
        paragraph.setSpacingAfter(2);
        document.add(paragraph);

        com.lowagie.text.pdf.PdfPTable lines = new com.lowagie.text.pdf.PdfPTable(1);
        lines.setWidthPercentage(100);
        lines.addCell(dottedLineCell(font));
        document.add(lines);
    }

    private com.lowagie.text.pdf.PdfPCell dottedLineCell(com.lowagie.text.Font font) {
        com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("", font));
        cell.setMinimumHeight(5.5f);
        cell.setBorder(com.lowagie.text.Rectangle.BOTTOM);
        cell.setBorderWidth(0.5f);
        cell.setBorderColor(java.awt.Color.BLACK);
        cell.setPadding(0);
        return cell;
    }

    private void drawSignatureBlocks(
            com.lowagie.text.Document document,
            AppraisalReportDto report,
            com.lowagie.text.Font font
    ) throws com.lowagie.text.DocumentException {
        com.lowagie.text.pdf.PdfPTable firstRow = new com.lowagie.text.pdf.PdfPTable(new float[]{250f, 45f, 250f});
        firstRow.setWidthPercentage(100);
        firstRow.setSpacingBefore(5);
        firstRow.addCell(signatureBlockCell(report.getManagerSignatureImage(), valueOrDash(report.getAppraiserSignatureCaption()), font));
        firstRow.addCell(blankSignatureSpacer());
        firstRow.addCell(signatureBlockCell(report.getDeptHeadSignatureImage(), valueOrDash(report.getDeptHeadSignatureCaption()), font));
        document.add(firstRow);

        com.lowagie.text.Paragraph reviewBy = new com.lowagie.text.Paragraph("Review by", font);
        reviewBy.setSpacingBefore(3);
        reviewBy.setLeading(7);
        document.add(reviewBy);

        com.lowagie.text.pdf.PdfPTable secondRow = new com.lowagie.text.pdf.PdfPTable(new float[]{250f, 45f, 250f});
        secondRow.setWidthPercentage(100);
        secondRow.setSpacingBefore(2);
        secondRow.addCell(signatureBlockCell(report.getHrSignatureImage(), valueOrDash(report.getHrSignatureCaption()), font));
        secondRow.addCell(blankSignatureSpacer());
        secondRow.addCell(blankSignatureSpacer());
        document.add(secondRow);
    }

    private com.lowagie.text.pdf.PdfPCell blankSignatureSpacer() {
        com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(""));
        cell.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
        return cell;
    }

    private com.lowagie.text.pdf.PdfPCell signatureBlockCell(
            Image signatureImage,
            String caption,
            com.lowagie.text.Font font
    ) {
        com.lowagie.text.pdf.PdfPCell outer = new com.lowagie.text.pdf.PdfPCell();
        outer.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
        outer.setPadding(0);

        com.lowagie.text.pdf.PdfPTable nested = new com.lowagie.text.pdf.PdfPTable(1);
        nested.setWidthPercentage(100);
        com.lowagie.text.pdf.PdfPCell lineCell = new com.lowagie.text.pdf.PdfPCell();
        lineCell.setBorder(com.lowagie.text.Rectangle.BOTTOM);
        lineCell.setBorderWidth(0.6f);
        lineCell.setBorderColor(java.awt.Color.BLACK);
        lineCell.setMinimumHeight(19);
        lineCell.setPadding(0);
        lineCell.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_CENTER);
        lineCell.setVerticalAlignment(com.lowagie.text.Element.ALIGN_BOTTOM);

        com.lowagie.text.Image pdfImage = toPdfImage(signatureImage);
        if (pdfImage != null) {
            lineCell.addElement(pdfImage);
        }
        nested.addCell(lineCell);

        com.lowagie.text.pdf.PdfPCell captionCell = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(blankIfNull(caption), font));
        captionCell.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
        captionCell.setMinimumHeight(9);
        captionCell.setPaddingTop(1);
        captionCell.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_LEFT);
        captionCell.setVerticalAlignment(com.lowagie.text.Element.ALIGN_TOP);
        nested.addCell(captionCell);

        outer.addElement(nested);
        return outer;
    }

    private com.lowagie.text.Image toPdfImage(Image image) {
        if (image == null) {
            return null;
        }
        try {
            com.lowagie.text.Image pdfImage = com.lowagie.text.Image.getInstance(image, null);
            pdfImage.scaleToFit(92, 17);
            pdfImage.setAlignment(com.lowagie.text.Element.ALIGN_CENTER);
            return pdfImage;
        } catch (Exception ignored) {
            return null;
        }
    }

    private com.lowagie.text.pdf.PdfPCell pdfCell(String text, com.lowagie.text.Font font, float minimumHeight, int alignment) {
        com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(blankIfNull(text), font));
        cell.setMinimumHeight(minimumHeight);
        cell.setPadding(2);
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(com.lowagie.text.Element.ALIGN_MIDDLE);
        cell.setBorderColor(java.awt.Color.BLACK);
        cell.setBorderWidth(0.6f);
        return cell;
    }

    private void drawSignatureLines(com.lowagie.text.Document document, com.lowagie.text.Font font) throws com.lowagie.text.DocumentException {
        com.lowagie.text.pdf.PdfPTable lines = new com.lowagie.text.pdf.PdfPTable(new float[]{230f, 79f, 230f});
        lines.setWidthPercentage(100);
        lines.setSpacingBefore(30);
        com.lowagie.text.pdf.PdfPCell left = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("\nSignature of Appraisee & Date", font));
        left.setBorder(com.lowagie.text.Rectangle.TOP);
        left.setBorderWidth(0.6f);
        left.setMinimumHeight(22);
        com.lowagie.text.pdf.PdfPCell middle = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("", font));
        middle.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
        com.lowagie.text.pdf.PdfPCell right = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("\nSignature of Appraiser & Date", font));
        right.setBorder(com.lowagie.text.Rectangle.TOP);
        right.setBorderWidth(0.6f);
        right.setMinimumHeight(22);
        lines.addCell(left);
        lines.addCell(middle);
        lines.addCell(right);
        document.add(lines);

        com.lowagie.text.Paragraph reviewBy = new com.lowagie.text.Paragraph("Review by", font);
        reviewBy.setSpacingBefore(12);
        document.add(reviewBy);
    }

    private void addSectionTitle(com.lowagie.text.Document document, String title, com.lowagie.text.Font font) throws com.lowagie.text.DocumentException {
        com.lowagie.text.Paragraph paragraph = new com.lowagie.text.Paragraph(title, font);
        paragraph.setSpacingBefore(10);
        paragraph.setSpacingAfter(4);
        document.add(paragraph);
    }

    private void addLabelValue(
            com.lowagie.text.pdf.PdfPTable table,
            String label,
            String value,
            com.lowagie.text.Font labelFont,
            com.lowagie.text.Font valueFont
    ) {
        addHeaderCell(table, label, labelFont);
        addValueCell(table, value, valueFont);
    }

    private void addHeaderCell(com.lowagie.text.pdf.PdfPTable table, String text, com.lowagie.text.Font font) {
        com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(valueOrDash(text), font));
        cell.setPadding(4);
        cell.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_CENTER);
        cell.setVerticalAlignment(com.lowagie.text.Element.ALIGN_MIDDLE);
        cell.setBackgroundColor(new java.awt.Color(229, 237, 247));
        table.addCell(cell);
    }

    private void addValueCell(com.lowagie.text.pdf.PdfPTable table, String text, com.lowagie.text.Font font) {
        com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(valueOrDash(text), font));
        cell.setPadding(4);
        cell.setVerticalAlignment(com.lowagie.text.Element.ALIGN_TOP);
        table.addCell(cell);
    }

    private void addCenteredCell(com.lowagie.text.pdf.PdfPTable table, String text, com.lowagie.text.Font font) {
        com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(blankIfNull(text), font));
        cell.setPadding(4);
        cell.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_CENTER);
        cell.setVerticalAlignment(com.lowagie.text.Element.ALIGN_MIDDLE);
        table.addCell(cell);
    }

    private InputStream openReportTemplate() throws IOException {
        ClassPathResource resource = new ClassPathResource(REPORT_PATH);
        if (resource.exists()) {
            return resource.getInputStream();
        }

        String relativeReportPath = REPORT_PATH.replace("/", java.io.File.separator);
        List<Path> fallbackPaths = List.of(
                Paths.get("src", "main", "resources", relativeReportPath),
                Paths.get("EPMS", "src", "main", "resources", relativeReportPath),
                Paths.get("target", "classes", relativeReportPath),
                Paths.get("EPMS", "target", "classes", relativeReportPath)
        );

        for (Path path : fallbackPaths) {
            if (Files.exists(path)) {
                return Files.newInputStream(path);
            }
        }

        throw new IOException("Jasper template not found at classpath:" + REPORT_PATH
                + " or fallback paths: " + fallbackPaths);
    }


    private String sanitizeFilenamePart(String value) {
        if (value == null) {
            return "";
        }
        return value.trim()
                .replaceAll("[\\/:*?\"<>|]+", "-")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }

    private String rootMessage(Throwable throwable) {
        Throwable current = throwable;
        String message = null;
        while (current != null) {
            if (current.getMessage() != null && !current.getMessage().isBlank()) {
                message = current.getMessage();
            }
            current = current.getCause();
        }
        return message != null ? message : throwable.getClass().getSimpleName();
    }

    private AppraisalReportDto buildReport(EmployeeAppraisalFormResponse form) {
        AppraisalReportDto report = new AppraisalReportDto();
        report.setReportTitle("Performance Appraisal Form");
        report.setCompanyName("ACE Data Systems Ltd.,");
        report.setGeneratedAt(formatDateTime(LocalDateTime.now()));

        report.setCycleName(valueOrDash(form.getCycleName()));
        report.setCycleType(form.getCycleType() != null ? prettify(form.getCycleType().name()) : "-");
        report.setCycleYear(form.getCycleYear() != null ? String.valueOf(form.getCycleYear()) : "-");
        report.setCycleStartDate(formatDate(form.getCycleStartDate()));
        report.setCycleEndDate(formatDate(form.getCycleEndDate()));

        report.setEmployeeName(valueOrDash(form.getEmployeeName()));
        report.setEmployeeCode(valueOrDash(form.getEmployeeCode()));
        report.setDepartmentName(valueOrDash(form.getDepartmentName()));
        report.setPositionName(valueOrDash(form.getPositionName()));
        report.setAssessmentDate(form.getAssessmentDate() != null ? formatDate(form.getAssessmentDate()) : formatSignatureDate(form.getPmSubmittedAt()));
        report.setEffectiveDate(formatDate(form.getEffectiveDate()));

        report.setTotalPoints(form.getTotalPoints() != null ? String.valueOf(form.getTotalPoints()) : "0");
        report.setAnsweredCriteriaCount(form.getAnsweredCriteriaCount() != null ? String.valueOf(form.getAnsweredCriteriaCount()) : "0");
        report.setScorePercent(form.getScorePercent() != null ? String.format(Locale.ENGLISH, "%.2f%%", form.getScorePercent()) : "0.00%");
        report.setPerformanceLabel(valueOrDash(form.getPerformanceLabel()));
        report.setStatus(form.getStatus() != null ? prettify(form.getStatus().name()) : "-");

        report.setCriteriaRows(buildCriteriaRows(form));
        report.setScoreBandRows(buildScoreBandRows(form.getScoreBands()));
        report.setScoreBandsText(buildScoreBandsText(report.getScoreBandRows()));
        report.setOtherRemarksText(buildOtherRemarksText(form.getReviews()));
        report.setManagerReviewText(buildReviewText(form.getReviews(), AppraisalReviewStage.PM, "Manager Review"));
        report.setDeptHeadReviewText(buildReviewText(form.getReviews(), AppraisalReviewStage.DEPT_HEAD, "Dept Head Review"));
        report.setHrReviewText(buildReviewText(form.getReviews(), AppraisalReviewStage.HR, "HR Review"));
        report.setAppraiserSignatureCaption(buildSignatureCaption(form.getReviews(), AppraisalReviewStage.PM, "Manager Signature / Date"));
        report.setDeptHeadSignatureCaption(buildSignatureCaption(form.getReviews(), AppraisalReviewStage.DEPT_HEAD, "Dept Head Signature / Date"));
        report.setHrSignatureCaption(buildSignatureCaption(form.getReviews(), AppraisalReviewStage.HR, "HR Signature / Date / Designation"));
        report.setManagerSignatureImage(findSignatureImage(form.getReviews(), AppraisalReviewStage.PM));
        report.setDeptHeadSignatureImage(findSignatureImage(form.getReviews(), AppraisalReviewStage.DEPT_HEAD));
        report.setHrSignatureImage(findSignatureImage(form.getReviews(), AppraisalReviewStage.HR));

        return report;
    }

    private Map<String, Object> buildParameters(AppraisalReportDto report) {
        Map<String, Object> params = new HashMap<>();
        params.put("reportTitle", report.getReportTitle());
        params.put("companyName", report.getCompanyName());
        params.put("generatedAt", report.getGeneratedAt());
        params.put("cycleName", report.getCycleName());
        params.put("cycleType", report.getCycleType());
        params.put("cycleYear", report.getCycleYear());
        params.put("cycleStartDate", report.getCycleStartDate());
        params.put("cycleEndDate", report.getCycleEndDate());
        params.put("employeeName", report.getEmployeeName());
        params.put("employeeCode", report.getEmployeeCode());
        params.put("departmentName", report.getDepartmentName());
        params.put("positionName", report.getPositionName());
        params.put("assessmentDate", report.getAssessmentDate());
        params.put("effectiveDate", report.getEffectiveDate());
        params.put("totalPoints", report.getTotalPoints());
        params.put("answeredCriteriaCount", report.getAnsweredCriteriaCount());
        params.put("scorePercent", report.getScorePercent());
        params.put("performanceLabel", report.getPerformanceLabel());
        params.put("status", report.getStatus());
        params.put("scoreBandsText", report.getScoreBandsText());
        params.put("otherRemarksText", report.getOtherRemarksText());
        params.put("managerReviewText", report.getManagerReviewText());
        params.put("deptHeadReviewText", report.getDeptHeadReviewText());
        params.put("hrReviewText", report.getHrReviewText());
        params.put("appraiserSignatureCaption", report.getAppraiserSignatureCaption());
        params.put("deptHeadSignatureCaption", report.getDeptHeadSignatureCaption());
        params.put("hrSignatureCaption", report.getHrSignatureCaption());
        params.put("managerSignatureImage", report.getManagerSignatureImage());
        params.put("deptHeadSignatureImage", report.getDeptHeadSignatureImage());
        params.put("hrSignatureImage", report.getHrSignatureImage());
        putScoreBandParameters(params, report.getScoreBandRows());
        return params;
    }

    private List<AppraisalReportCriteriaRowDto> buildCriteriaRows(EmployeeAppraisalFormResponse form) {
        if (form.getSections() == null || form.getSections().isEmpty()) {
            return noCriteriaRows();
        }

        java.util.ArrayList<AppraisalReportCriteriaRowDto> rows = new java.util.ArrayList<>();
        int criteriaNumber = 1;
        for (AppraisalSectionResponse section : form.getSections()) {
            if (section == null || section.getCriteria() == null || section.getCriteria().isEmpty()) {
                continue;
            }

            String sectionName = valueOrDash(section.getSectionName());
            List<AppraisalCriterionResponse> criteriaList = section.getCriteria().stream()
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());

            for (AppraisalCriterionResponse criteria : criteriaList) {
                rows.add(new AppraisalReportCriteriaRowDto(
                        sectionName,
                        String.valueOf(criteriaNumber++),
                        valueOrDash(criteria.getCriteriaText()),
                        ratingMark(criteria, 5),
                        ratingMark(criteria, 4),
                        ratingMark(criteria, 3),
                        ratingMark(criteria, 2),
                        ratingMark(criteria, 1),
                        blankIfNull(criteria.getRatingComment())
                ));
            }
        }

        return rows.isEmpty() ? noCriteriaRows() : rows;
    }

    private List<AppraisalReportCriteriaRowDto> noCriteriaRows() {
        return List.of(new AppraisalReportCriteriaRowDto(
                "Evaluation Criteria",
                "-",
                "No criteria available.",
                "",
                "",
                "",
                "",
                "",
                ""
        ));
    }

    private String ratingMark(AppraisalCriterionResponse criteria, int expectedRating) {
        return criteria.getRatingValue() != null && criteria.getRatingValue() == expectedRating ? "checked" : "";
    }

    private List<AppraisalReportScoreBandRowDto> buildScoreBandRows(List<AppraisalScoreBandResponse> scoreBands) {
        List<AppraisalScoreBandResponse> source = scoreBands == null || scoreBands.isEmpty()
                ? defaultScoreBands()
                : scoreBands;

        List<AppraisalReportScoreBandRowDto> rows = source.stream()
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(band -> band.getSortOrder() == null ? 0 : band.getSortOrder()))
                .map(band -> new AppraisalReportScoreBandRowDto(
                        formatScoreRange(band.getMinScore(), band.getMaxScore()),
                        valueOrDash(band.getLabel()),
                        blankIfNull(band.getDescription())
                ))
                .collect(Collectors.toCollection(ArrayList::new));

        while (rows.size() < 5) {
            rows.add(new AppraisalReportScoreBandRowDto("", "", ""));
        }
        return rows.size() > 5 ? rows.subList(0, 5) : rows;
    }

    private List<AppraisalScoreBandResponse> defaultScoreBands() {
        return List.of(
                new AppraisalScoreBandResponse(null, 90, 100, "Outstanding", "Performance exceptional and far exceeds expectations.", 1, true),
                new AppraisalScoreBandResponse(null, 80, 89, "Exceeds Requirements", "Performance is consistent and clearly meets essential requirements.", 2, true),
                new AppraisalScoreBandResponse(null, 70, 79, "Meet Requirement", "Performance is satisfactory and meets requirements of the job.", 3, true),
                new AppraisalScoreBandResponse(null, 60, 69, "Need Improvement", "Performance is inconsistent. Supervision and training are needed.", 4, true),
                new AppraisalScoreBandResponse(null, 0, 59, "Unsatisfactory", "Performance does not meet the minimum requirement of the job.", 5, true)
        );
    }

    private String formatScoreRange(Integer minScore, Integer maxScore) {
        String min = minScore == null ? "" : String.format(Locale.ENGLISH, "%02d", minScore);
        String max = maxScore == null ? "" : String.valueOf(maxScore);
        return min + "-" + max;
    }

    private String buildScoreBandsText(List<AppraisalReportScoreBandRowDto> scoreBands) {
        if (scoreBands == null || scoreBands.isEmpty()) {
            return "-";
        }
        return scoreBands.stream()
                .filter(Objects::nonNull)
                .filter(band -> !blankIfNull(band.getScore()).isBlank() || !blankIfNull(band.getLabel()).isBlank())
                .map(band -> String.format(
                        Locale.ENGLISH,
                        "%s : %s%s",
                        blankIfNull(band.getScore()),
                        valueOrDash(band.getLabel()),
                        band.getDescription() != null && !band.getDescription().isBlank()
                                ? " — " + band.getDescription()
                                : ""
                ))
                .collect(Collectors.joining("\n"));
    }

    private void putScoreBandParameters(Map<String, Object> params, List<AppraisalReportScoreBandRowDto> scoreBands) {
        List<AppraisalReportScoreBandRowDto> rows = scoreBands == null ? List.of() : scoreBands;
        for (int index = 0; index < 5; index++) {
            AppraisalReportScoreBandRowDto row = index < rows.size() ? rows.get(index) : new AppraisalReportScoreBandRowDto("", "", "");
            int no = index + 1;
            params.put("scoreBand" + no + "Score", blankIfNull(row.getScore()));
            params.put("scoreBand" + no + "Label", blankIfNull(row.getLabel()));
            params.put("scoreBand" + no + "Description", blankIfNull(row.getDescription()));
        }
    }

    private String buildReviewText(List<AppraisalReviewResponse> reviews, AppraisalReviewStage stage, String title) {
        AppraisalReviewResponse review = findReview(reviews, stage).orElse(null);
        if (review == null) {
            return title + "\nReviewer: -\nSubmitted At: -\nRecommendation: -\nComment: -";
        }

        String reviewer = review.getReviewerName() != null && !review.getReviewerName().isBlank()
                ? review.getReviewerName()
                : "-";
        String employeeId = review.getReviewerEmployeeId() != null && !review.getReviewerEmployeeId().isBlank()
                ? " (" + review.getReviewerEmployeeId() + ")"
                : "";

        return title
                + "\nReviewer: " + reviewer + employeeId
                + "\nSubmitted At: " + formatDateTime(review.getSubmittedAt())
                + "\nDecision: " + (review.getDecision() != null ? prettify(review.getDecision().name()) : "-")
                + "\nRecommendation: " + valueOrDash(review.getRecommendation())
                + "\nComment: " + valueOrDash(review.getComment());
    }


    private String buildOtherRemarksText(List<AppraisalReviewResponse> reviews) {
        StringBuilder remarks = new StringBuilder();
        appendRemark(remarks, "Appraiser's Comment for Discussion", findReview(reviews, AppraisalReviewStage.PM).orElse(null));
        appendRemark(remarks, "Dept Head Comment", findReview(reviews, AppraisalReviewStage.DEPT_HEAD).orElse(null));
        appendRemark(remarks, "HR Comment", findReview(reviews, AppraisalReviewStage.HR).orElse(null));
        return remarks.length() == 0 ? "" : remarks.toString().trim();
    }

    private void appendRemark(StringBuilder remarks, String label, AppraisalReviewResponse review) {
        if (review == null) {
            return;
        }
        String comment = review.getComment() != null ? review.getComment().trim() : "";
        String recommendation = review.getRecommendation() != null ? review.getRecommendation().trim() : "";
        if (comment.isBlank() && recommendation.isBlank()) {
            return;
        }
        if (remarks.length() > 0) {
            remarks.append("\n");
        }
        remarks.append(label).append(": ");
        if (!comment.isBlank()) {
            remarks.append(comment);
        }
        if (!recommendation.isBlank()) {
            if (!comment.isBlank()) {
                remarks.append(" | ");
            }
            remarks.append("Recommendation: ").append(recommendation);
        }
    }

    private String buildSignatureCaption(List<AppraisalReviewResponse> reviews, AppraisalReviewStage stage, String roleLabel) {
        AppraisalReviewResponse review = findReview(reviews, stage).orElse(null);
        if (review == null) {
            return roleLabel;
        }
        String reviewer = review.getReviewerName() != null && !review.getReviewerName().isBlank()
                ? review.getReviewerName().trim()
                : "-";
        String submittedAt = formatSignatureDate(review.getSubmittedAt());
        return roleLabel + ": " + reviewer
                + (submittedAt != null && !submittedAt.isBlank() && !"-".equals(submittedAt) ? " / " + submittedAt : "");
    }

    private Image findSignatureImage(List<AppraisalReviewResponse> reviews, AppraisalReviewStage stage) {
        return findReview(reviews, stage)
                .map(AppraisalReviewResponse::getSignatureImageData)
                .map(this::decodeSignatureImage)
                .orElse(null);
    }

    private Optional<AppraisalReviewResponse> findReview(List<AppraisalReviewResponse> reviews, AppraisalReviewStage stage) {
        if (reviews == null || stage == null) {
            return Optional.empty();
        }
        return reviews.stream()
                .filter(Objects::nonNull)
                .filter(review -> review.getReviewStage() == stage)
                .max((left, right) -> {
                    Date leftDate = left.getSubmittedAt();
                    Date rightDate = right.getSubmittedAt();
                    if (leftDate == null && rightDate == null) {
                        return Integer.compare(left.getId() != null ? left.getId() : 0, right.getId() != null ? right.getId() : 0);
                    }
                    if (leftDate == null) {
                        return -1;
                    }
                    if (rightDate == null) {
                        return 1;
                    }
                    return leftDate.compareTo(rightDate);
                });
    }

    private Image decodeSignatureImage(String imageData) {
        if (imageData == null || imageData.isBlank()) {
            return null;
        }
        try {
            String payload = imageData.trim();
            int commaIndex = payload.indexOf(',');
            if (payload.startsWith("data:") && commaIndex >= 0) {
                payload = payload.substring(commaIndex + 1);
            }
            byte[] bytes = Base64.getDecoder().decode(payload);
            return ImageIO.read(new ByteArrayInputStream(bytes));
        } catch (IllegalArgumentException | IOException ignored) {
            return null;
        }
    }

    private String formatDate(LocalDate value) {
        return value != null ? DATE_FORMAT.format(value) : "";
    }

    private String formatDateTime(LocalDateTime value) {
        return value != null ? DATE_TIME_FORMAT.format(value) : "";
    }

    private String formatDateTime(Date value) {
        return value != null ? LEGACY_DATE_TIME_FORMAT.format(value) : "-";
    }

    private String formatSignatureDate(Date value) {
        return value != null ? LEGACY_DATE_FORMAT.format(value) : "-";
    }

    private String compactText(String value, int maxLength) {
        if (value == null) {
            return "";
        }
        String normalized = value.replaceAll("\\s+", " ").trim();
        if (normalized.length() <= maxLength) {
            return normalized;
        }
        return normalized.substring(0, Math.max(0, maxLength - 1)).trim() + "…";
    }

    private String compactMultiline(String value, int maxLength) {
        if (value == null) {
            return "";
        }
        String normalized = value.replace("\r", "").replaceAll("\n{2,}", "\n").trim();
        if (normalized.length() <= maxLength) {
            return normalized;
        }
        return normalized.substring(0, Math.max(0, maxLength - 1)).trim() + "…";
    }

    private String blankIfNull(String value) {
        return value == null ? "" : value;
    }

    private String valueOrDash(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }

    private String prettify(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }
        String normalized = value.replace('_', ' ').toLowerCase(Locale.ENGLISH);
        String[] words = normalized.split(" ");
        StringBuilder builder = new StringBuilder();
        for (String word : words) {
            if (word.isBlank()) {
                continue;
            }
            if (builder.length() > 0) {
                builder.append(' ');
            }
            builder.append(Character.toUpperCase(word.charAt(0))).append(word.substring(1));
        }
        return builder.toString();
    }
}
