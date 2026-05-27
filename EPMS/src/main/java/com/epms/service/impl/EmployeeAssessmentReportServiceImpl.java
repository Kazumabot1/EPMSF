package com.epms.service.impl;

import com.epms.dto.EmployeeAssessmentDtos.AssessmentItemResponse;
import com.epms.dto.EmployeeAssessmentDtos.AssessmentResponse;
import com.epms.dto.EmployeeAssessmentDtos.AssessmentScoreBandResponse;
import com.epms.dto.EmployeeAssessmentDtos.AssessmentSectionResponse;
import com.epms.exception.BadRequestException;
import com.epms.service.EmployeeAssessmentReportService;
import com.epms.service.EmployeeAssessmentService;
import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmployeeAssessmentReportServiceImpl implements EmployeeAssessmentReportService {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter DATE_TIME_FORMAT = DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.ENGLISH);
    private static final String COMPANY_NAME = "ACE Data Systems Ltd.,";

    private final EmployeeAssessmentService employeeAssessmentService;

    @Override
    @Transactional(readOnly = true)
    public byte[] generateSelfAssessmentPdf(Long assessmentId) {
        AssessmentResponse assessment = employeeAssessmentService.getById(assessmentId);
        if (!isApprovedStatus(assessment.getStatus())) {
            throw new BadRequestException("HR must approve this self-assessment before exporting the PDF.");
        }
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4, 18, 18, 12, 12);
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, Color.BLACK);
            Font subtitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10.5f, Color.BLACK);
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8f, Color.BLACK);
            Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 7.8f, Color.BLACK);
            Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 7.1f, Color.BLACK);
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.8f, Color.BLACK);
            Font checkFont = FontFactory.getFont(FontFactory.ZAPFDINGBATS, 8.5f, Color.BLACK);

            document.add(buildReportTitleBar(titleFont));

            Paragraph heading = new Paragraph("Employee Self-assessment Form", subtitleFont);
            heading.setAlignment(Element.ALIGN_CENTER);
            heading.setSpacingAfter(2f);
            document.add(heading);

            Paragraph company = new Paragraph(value(assessment.getCompanyName(), COMPANY_NAME), subtitleFont);
            company.setAlignment(Element.ALIGN_CENTER);
            company.setSpacingAfter(5f);
            document.add(company);

            document.add(buildEmployeeInfoTable(assessment, normalFont, boldFont));
            addSpacer(document, 5f);

            document.add(buildEvaluationTable(assessment, normalFont, smallFont, headerFont, checkFont));
            addSpacer(document, 5f);

            document.add(buildScoreSummaryTable(assessment, normalFont, boldFont));
            addSpacer(document, 5f);
            document.add(buildScoreGuideTable(assessment, normalFont, boldFont));
            addSpacer(document, 5f);
            document.add(buildRemarksTable(assessment, normalFont, boldFont));
            addSpacer(document, 5f);
            document.add(buildSignatureTable(assessment, normalFont, boldFont));

            document.close();
            return out.toByteArray();
        } catch (Exception ex) {
            return buildFallbackPdf(assessment);
        }
    }


    private byte[] buildFallbackPdf(AssessmentResponse assessment) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4, 28, 28, 28, 28);
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, Color.BLACK);
            Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.BLACK);

            Paragraph heading = new Paragraph("Employee Self-assessment Form", titleFont);
            heading.setAlignment(Element.ALIGN_CENTER);
            heading.setSpacingAfter(8f);
            document.add(heading);

            document.add(buildEmployeeInfoTable(assessment, normalFont, boldFont));
            addSpacer(document, 8f);
            document.add(new Paragraph("The full report layout could not be rendered, so this safe report was generated with the approved record summary.", normalFont));
            addSpacer(document, 8f);
            document.add(buildScoreSummaryTable(assessment, normalFont, boldFont));
            addSpacer(document, 8f);
            document.add(buildRemarksTable(assessment, normalFont, boldFont));
            addSpacer(document, 8f);
            document.add(buildSignatureTable(assessment, normalFont, boldFont));

            document.close();
            return out.toByteArray();
        } catch (Exception fallbackException) {
            throw new IllegalStateException("Self-assessment PDF report could not be generated.", fallbackException);
        }
    }


    private boolean isApprovedStatus(String status) {
        return status != null && "APPROVED".equalsIgnoreCase(status.trim());
    }

    @Override
    @Transactional(readOnly = true)
    public String buildSelfAssessmentPdfFilename(Long assessmentId) {
        AssessmentResponse assessment = employeeAssessmentService.getById(assessmentId);
        String employee = sanitizeFilename(value(assessment.getEmployeeName(), "employee"));
        return "employee-self-assessment-" + employee + "-" + assessmentId + ".pdf";
    }

    private PdfPTable buildReportTitleBar(Font titleFont) {
        PdfPTable table = new PdfPTable(1);
        table.setWidthPercentage(100);
        PdfPCell cell = new PdfPCell(new Phrase("Employee Self-assessment Form", titleFont));
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setBackgroundColor(new Color(252, 232, 217));
        cell.setPaddingTop(7f);
        cell.setPaddingBottom(7f);
        cell.setHorizontalAlignment(Element.ALIGN_LEFT);
        table.addCell(cell);
        return table;
    }

    private PdfPTable buildEmployeeInfoTable(AssessmentResponse assessment, Font normalFont, Font boldFont) {
        PdfPTable table = new PdfPTable(new float[]{40, 60});
        table.setWidthPercentage(100);
        table.addCell(labelCell("Employee Name :", boldFont));
        table.addCell(valueCell(value(assessment.getEmployeeName()), normalFont));
        table.addCell(labelCell("Employee ID :", boldFont));
        table.addCell(valueCell(value(assessment.getEmployeeCode()), normalFont));
        table.addCell(labelCell("Current Position :", boldFont));
        table.addCell(valueCell(value(assessment.getCurrentPosition()), normalFont));
        table.addCell(labelCell("Department :", boldFont));
        table.addCell(valueCell(value(assessment.getDepartmentName()), normalFont));
        table.addCell(labelCell("Assessment Date :", boldFont));
        table.addCell(valueCell(formatDate(assessment.getAssessmentDate(), assessment.getSubmittedAt()), normalFont));
        table.addCell(labelCell("Manager Name :", boldFont));
        table.addCell(valueCell(value(assessment.getManagerName()), normalFont));
        return table;
    }

    private PdfPTable buildEvaluationTable(
            AssessmentResponse assessment,
            Font normalFont,
            Font smallFont,
            Font headerFont,
            Font checkFont
    ) {
        PdfPTable title = new PdfPTable(1);
        title.setWidthPercentage(100);
        PdfPCell titleCell = new PdfPCell(new Phrase("Evaluations", headerFont));
        titleCell.setBorder(Rectangle.NO_BORDER);
        titleCell.setPadding(0f);
        titleCell.setPaddingBottom(2f);
        title.addCell(titleCell);

        PdfPTable table = new PdfPTable(new float[]{7, 46, 8, 8, 6.2f, 6.2f, 6.2f, 6.2f, 6.2f});
        table.setWidthPercentage(100);

        PdfPCell noHeader = headerCell("No.", headerFont);
        noHeader.setRowspan(2);
        table.addCell(noHeader);
        PdfPCell subjectHeader = headerCell("Assessment Subject", headerFont);
        subjectHeader.setRowspan(2);
        table.addCell(subjectHeader);
        PdfPCell yesHeader = headerCell("Yes", headerFont);
        yesHeader.setRowspan(2);
        table.addCell(yesHeader);
        PdfPCell noAnswerHeader = headerCell("No", headerFont);
        noAnswerHeader.setRowspan(2);
        table.addCell(noAnswerHeader);
        PdfPCell ratingHeader = headerCell("Rating", headerFont);
        ratingHeader.setColspan(5);
        table.addCell(ratingHeader);
        for (int rating = 1; rating <= 5; rating++) {
            table.addCell(headerCell(String.valueOf(rating), headerFont));
        }

        List<AssessmentSectionResponse> sections = safeSections(assessment);
        int[] number = {1};
        for (AssessmentSectionResponse section : sections) {
            List<AssessmentItemResponse> items = safeItems(section);
            if (sections.size() > 1 && section.getTitle() != null && !section.getTitle().isBlank()) {
                PdfPCell sectionRow = headerCell(section.getTitle(), smallFont);
                sectionRow.setColspan(9);
                sectionRow.setHorizontalAlignment(Element.ALIGN_LEFT);
                table.addCell(sectionRow);
            }
            if (items.isEmpty()) {
                addEvaluationRow(table, number[0]++, "-", null, null, normalFont, checkFont);
            } else {
                for (AssessmentItemResponse item : items) {
                    addEvaluationRow(
                            table,
                            number[0]++,
                            value(item.getQuestionText()),
                            item.getYesNoAnswer(),
                            item.getRating(),
                            normalFont,
                            checkFont
                    );
                }
            }
        }

        PdfPCell totalLabel = headerCell("Total Points", headerFont);
        totalLabel.setColspan(7);
        table.addCell(totalLabel);
        PdfPCell totalValue = headerCell(formatScore(assessment.getTotalScore()), headerFont);
        totalValue.setColspan(2);
        table.addCell(totalValue);

        PdfPTable wrapper = new PdfPTable(1);
        wrapper.setWidthPercentage(100);
        PdfPCell t = new PdfPCell(title);
        t.setBorder(Rectangle.NO_BORDER);
        t.setPadding(0f);
        wrapper.addCell(t);
        PdfPCell body = new PdfPCell(table);
        body.setBorder(Rectangle.NO_BORDER);
        body.setPadding(0f);
        wrapper.addCell(body);
        return wrapper;
    }

    private void addEvaluationRow(
            PdfPTable table,
            int number,
            String questionText,
            Boolean yesNoAnswer,
            Integer rating,
            Font normalFont,
            Font checkFont
    ) {
        table.addCell(centerCell(String.valueOf(number), normalFont));
        table.addCell(valueCell(questionText, normalFont));
        table.addCell(checkCell(Boolean.TRUE.equals(yesNoAnswer), normalFont, checkFont));
        table.addCell(checkCell(Boolean.FALSE.equals(yesNoAnswer), normalFont, checkFont));
        for (int value = 1; value <= 5; value++) {
            table.addCell(checkCell(rating != null && rating == value, normalFont, checkFont));
        }
    }

    private PdfPCell checkCell(boolean checked, Font normalFont, Font checkFont) {
        PdfPCell cell = new PdfPCell(new Phrase(checked ? checkMark() : "", checked ? checkFont : normalFont));
        cell.setBorderColor(Color.BLACK);
        cell.setPadding(2f);
        cell.setMinimumHeight(18f);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        return cell;
    }

    private String checkMark() {
        return "4";
    }

    private PdfPTable buildScoreSummaryTable(AssessmentResponse assessment, Font normalFont, Font boldFont) {
        PdfPTable table = new PdfPTable(new float[]{33, 34, 33});
        table.setWidthPercentage(100);
        table.addCell(headerCell("Analysis", boldFont));
        table.addCell(headerCell("Formula", boldFont));
        table.addCell(headerCell("Score", boldFont));
        table.addCell(centerCell("Total Points", boldFont));
        table.addCell(centerCell("Total Point / Number of Questions Answered × 5 × 100", normalFont));
        table.addCell(centerCell(formatPercent(assessment.getScorePercent()), boldFont));
        table.addCell(centerCell("Current Result", boldFont));
        table.addCell(centerCell(formatScore(assessment.getTotalScore()) + " / " + formatScore(assessment.getMaxScore()) + " × 100", normalFont));
        table.addCell(centerCell(value(assessment.getPerformanceLabel()), boldFont));
        return table;
    }

    private PdfPTable buildScoreGuideTable(AssessmentResponse assessment, Font normalFont, Font boldFont) {
        PdfPTable table = new PdfPTable(new float[]{17, 25, 58});
        table.setWidthPercentage(100);
        table.addCell(headerCell("Score", boldFont));
        table.addCell(headerCell("Rating", boldFont));
        table.addCell(headerCell("Description", boldFont));
        for (AssessmentScoreBandResponse band : safeScoreBands(assessment)) {
            table.addCell(centerCell(formatScoreRange(band), normalFont));
            table.addCell(valueCell(value(band.getLabel()), boldFont));
            table.addCell(valueCell(value(band.getDescription()), normalFont));
        }
        return table;
    }

    private PdfPTable buildRemarksTable(AssessmentResponse assessment, Font normalFont, Font boldFont) {
        PdfPTable table = new PdfPTable(1);
        table.setWidthPercentage(100);
        table.addCell(headerCell("Other Remarks", boldFont));
        String remarks = "Employee Remarks: " + value(assessment.getRemarks())
                + "\nManager Comment: " + value(assessment.getManagerComment())
                + "\nHR Comment: " + value(assessment.getHrComment());
        PdfPCell cell = valueCell(remarks, normalFont);
        cell.setMinimumHeight(44f);
        table.addCell(cell);
        return table;
    }

    private PdfPTable buildSignatureTable(AssessmentResponse assessment, Font normalFont, Font boldFont) {
        PdfPTable table = new PdfPTable(new float[]{33, 34, 33});
        table.setWidthPercentage(100);
        table.addCell(signatureCell("Employee Signature / Date", assessment.getEmployeeSignatureImageData(), assessment.getEmployeeSignatureImageType(), assessment.getEmployeeSignedAt(), normalFont, boldFont));
        table.addCell(signatureCell("Manager Signature / Date", assessment.getManagerSignatureImageData(), assessment.getManagerSignatureImageType(), assessment.getManagerSignedAt(), normalFont, boldFont));
        table.addCell(signatureCell("HR Signature / Date", assessment.getHrSignatureImageData(), assessment.getHrSignatureImageType(), assessment.getHrSignedAt(), normalFont, boldFont));
        return table;
    }

    private PdfPCell signatureCell(String label, String imageData, String imageType, LocalDateTime signedAt, Font normalFont, Font boldFont) {
        PdfPCell cell = new PdfPCell();
        cell.setPadding(5f);
        cell.setMinimumHeight(70f);
        cell.setBorderColor(Color.BLACK);
        cell.setVerticalAlignment(Element.ALIGN_BOTTOM);
        Image signature = decodeSignatureImage(imageData);
        if (signature != null) {
            signature.scaleToFit(75f, 26f);
            signature.setAlignment(Element.ALIGN_CENTER);
            cell.addElement(signature);
        } else {
            Paragraph blank = new Paragraph("\n", normalFont);
            blank.setSpacingAfter(10f);
            cell.addElement(blank);
        }
        cell.addElement(new Chunk("____________________", normalFont));
        Paragraph caption = new Paragraph(label + (signedAt != null ? "\n" + DATE_TIME_FORMAT.format(signedAt) : ""), boldFont);
        caption.setAlignment(Element.ALIGN_LEFT);
        cell.addElement(caption);
        return cell;
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
            return Image.getInstance(Base64.getDecoder().decode(payload));
        } catch (Exception ignored) {
            return null;
        }
    }

    private List<AssessmentSectionResponse> safeSections(AssessmentResponse assessment) {
        return assessment.getSections() == null ? List.of() : assessment.getSections().stream()
                .sorted(Comparator.comparing(section -> section.getOrderNo() == null ? 0 : section.getOrderNo()))
                .collect(Collectors.toList());
    }

    private List<AssessmentItemResponse> safeItems(AssessmentSectionResponse section) {
        return section.getItems() == null ? List.of() : section.getItems().stream()
                .sorted(Comparator.comparing(item -> item.getItemOrder() == null ? 0 : item.getItemOrder()))
                .collect(Collectors.toList());
    }

    private List<AssessmentScoreBandResponse> safeScoreBands(AssessmentResponse assessment) {
        if (assessment.getScoreBands() == null || assessment.getScoreBands().isEmpty()) {
            return List.of(
                    AssessmentScoreBandResponse.builder().minScore(86).maxScore(100).label("Outstanding").description("Performance exceptional and far exceeds expectations.").sortOrder(1).build(),
                    AssessmentScoreBandResponse.builder().minScore(71).maxScore(85).label("Good").description("Performance is consistent. Clearly meets essential requirements of job.").sortOrder(2).build(),
                    AssessmentScoreBandResponse.builder().minScore(60).maxScore(70).label("Meet Requirement").description("Performance is satisfactory. Meets requirements of the job.").sortOrder(3).build(),
                    AssessmentScoreBandResponse.builder().minScore(40).maxScore(59).label("Need Improvement").description("Supervision and training are required for most problem areas.").sortOrder(4).build(),
                    AssessmentScoreBandResponse.builder().minScore(0).maxScore(39).label("Unsatisfactory").description("Performance does not meet the minimum requirement of the job.").sortOrder(5).build()
            );
        }
        return assessment.getScoreBands().stream()
                .sorted(Comparator.comparing(band -> band.getSortOrder() == null ? 0 : band.getSortOrder()))
                .collect(Collectors.toList());
    }

    private PdfPCell labelCell(String value, Font font) {
        return valueCell(value, font);
    }

    private PdfPCell headerCell(String value, Font font) {
        PdfPCell cell = centerCell(value, font);
        cell.setBackgroundColor(new Color(245, 245, 245));
        return cell;
    }

    private PdfPCell valueCell(String value, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(value(value), font));
        cell.setBorderColor(Color.BLACK);
        cell.setPadding(3f);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        return cell;
    }

    private PdfPCell centerCell(String value, Font font) {
        PdfPCell cell = valueCell(value, font);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        return cell;
    }

    private void addSpacer(Document document, float height) throws Exception {
        Paragraph spacer = new Paragraph(" ");
        spacer.setLeading(height);
        document.add(spacer);
    }

    private String value(String value) {
        return value(value, "-");
    }

    private String value(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String formatDate(LocalDate value, LocalDateTime fallback) {
        if (value != null) return DATE_FORMAT.format(value);
        if (fallback != null) return DATE_TIME_FORMAT.format(fallback);
        return "-";
    }

    private String formatScore(Double value) {
        if (value == null) return "0";
        if (Math.rint(value) == value) return String.valueOf(value.intValue());
        return String.format(Locale.ENGLISH, "%.2f", value);
    }

    private String formatPercent(Double value) {
        if (value == null) return "0.00%";
        return String.format(Locale.ENGLISH, "%.2f%%", value);
    }

    private String formatScoreRange(AssessmentScoreBandResponse band) {
        return String.format(Locale.ENGLISH, "%02d-%d", band.getMinScore() == null ? 0 : band.getMinScore(), band.getMaxScore() == null ? 0 : band.getMaxScore());
    }

    private String sanitizeFilename(String value) {
        String sanitized = value == null ? "employee" : value.trim()
                .replaceAll("[\\\\/:*?\"<>|]+", "-")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
        return sanitized.isBlank() ? "employee" : sanitized;
    }
}
