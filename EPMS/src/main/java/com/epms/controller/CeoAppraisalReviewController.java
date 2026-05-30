package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.entity.AppraisalReview;
import com.epms.entity.Employee;
import com.epms.entity.EmployeeAppraisalForm;
import com.epms.entity.Position;
import com.epms.entity.User;
import com.epms.repository.EmployeeAppraisalFormRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.Date;
import java.util.List;

@RestController
@RequestMapping("/api/appraisal-reviews")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CeoAppraisalReviewController {

    private final EmployeeAppraisalFormRepository employeeAppraisalFormRepository;

    @GetMapping
    @Transactional(readOnly = true)
    @PreAuthorize(
            "hasRole('CEO') "
                    + "or hasAuthority('ROLE_CEO') "
                    + "or hasRole('EXECUTIVE') "
                    + "or hasAuthority('ROLE_EXECUTIVE') "
                    + "or authentication.principal.dashboard == 'EXECUTIVE_DASHBOARD' "
                    + "or hasRole('HRADMIN') "
                    + "or hasAuthority('ROLE_ADMIN') "
                    + "or authentication.principal.dashboard == 'HRADMIN_DASHBOARD' "
                    + "or hasRole('HR') "
                    + "or hasAuthority('ROLE_HR') "
                    + "or authentication.principal.dashboard == 'HR_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<List<CeoAppraisalReviewRow>>> getExecutiveAppraisalReports() {
        List<CeoAppraisalReviewRow> rows = employeeAppraisalFormRepository.findAll()
                .stream()
                .sorted(
                        Comparator.comparing(
                                EmployeeAppraisalForm::getUpdatedAt,
                                Comparator.nullsLast(Comparator.reverseOrder())
                        )
                )
                .map(this::toRow)
                .toList();

        return ResponseEntity.ok(
                GenericApiResponse.success("Executive appraisal reports fetched", rows)
        );
    }

    private CeoAppraisalReviewRow toRow(EmployeeAppraisalForm form) {
        AppraisalReview latestReview = latestReview(form);

        CeoAppraisalReviewRow row = new CeoAppraisalReviewRow();

        row.setId(form.getId());
        row.setAppraisalId(form.getId());

        row.setEmployeeId(form.getEmployee() == null ? null : form.getEmployee().getId());
        row.setEmployeeName(firstNonBlank(
                form.getEmployeeNameSnapshot(),
                employeeFullName(form.getEmployee()),
                "-"
        ));
        row.setEmployeeCode(firstNonBlank(
                form.getEmployeeCodeSnapshot(),
                "-"
        ));

        row.setDepartmentId(form.getDepartment() == null ? null : form.getDepartment().getId());
        row.setDepartmentName(firstNonBlank(
                form.getDepartmentNameSnapshot(),
                form.getDepartment() == null ? null : form.getDepartment().getDepartmentName(),
                "-"
        ));

        row.setPositionName(firstNonBlank(
                form.getPositionSnapshot(),
                positionTitle(form.getEmployee()),
                "-"
        ));

        row.setCycleId(form.getCycle() == null ? null : form.getCycle().getId());
        row.setCycleName(form.getCycle() == null ? "-" : form.getCycle().getCycleName());

        row.setManagerName(userName(form.getProjectManager()));
        row.setDepartmentHeadName(userName(form.getDepartmentHead()));

        row.setReviewType(
                latestReview == null || latestReview.getReviewStage() == null
                        ? "APPRAISAL_FORM"
                        : latestReview.getReviewStage().name()
        );

        row.setReviewStatus(form.getStatus() == null ? "UNKNOWN" : form.getStatus().name());

        row.setReviewDecision(
                latestReview == null || latestReview.getDecision() == null
                        ? null
                        : latestReview.getDecision().name()
        );

        row.setTotalScore(form.getTotalPoints());
        row.setScorePercent(form.getScorePercent());
        row.setPerformanceLabel(firstNonBlank(form.getPerformanceLabel(), "-"));

        row.setComments(latestReview == null ? null : latestReview.getComment());
        row.setRecommendation(latestReview == null ? null : latestReview.getRecommendation());

        row.setPmSubmittedAt(form.getPmSubmittedAt());
        row.setDeptHeadSubmittedAt(form.getDeptHeadSubmittedAt());
        row.setHrApprovedAt(form.getHrApprovedAt());
        row.setUpdatedAt(form.getUpdatedAt());

        return row;
    }

    private AppraisalReview latestReview(EmployeeAppraisalForm form) {
        if (form.getReviews() == null || form.getReviews().isEmpty()) {
            return null;
        }

        return form.getReviews()
                .stream()
                .max(
                        Comparator.comparing(
                                this::reviewSortDate,
                                Comparator.nullsLast(Date::compareTo)
                        )
                )
                .orElse(null);
    }

    private Date reviewSortDate(AppraisalReview review) {
        if (review == null) {
            return null;
        }

        if (review.getSubmittedAt() != null) {
            return review.getSubmittedAt();
        }

        if (review.getUpdatedAt() != null) {
            return review.getUpdatedAt();
        }

        return review.getCreatedAt();
    }

    private String employeeFullName(Employee employee) {
        if (employee == null) {
            return null;
        }

        return firstNonBlank(
                joinName(employee.getFirstName(), employee.getLastName()),
                employee.getEmail()
        );
    }

    private String positionTitle(Employee employee) {
        if (employee == null) {
            return null;
        }

        Position position = employee.getPosition();

        if (position == null) {
            return null;
        }

        return position.getPositionTitle();
    }

    private String userName(User user) {
        if (user == null) {
            return "-";
        }

        return firstNonBlank(user.getFullName(), user.getEmail(), "-");
    }

    private String joinName(String firstName, String lastName) {
        String joined = ((firstName == null ? "" : firstName.trim()) + " " + (lastName == null ? "" : lastName.trim())).trim();
        return joined.isBlank() ? null : joined;
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }

        for (String value : values) {
            if (value != null && !value.trim().isBlank()) {
                return value.trim();
            }
        }

        return null;
    }

    @Data
    public static class CeoAppraisalReviewRow {
        private Integer id;
        private Integer appraisalId;

        private Integer employeeId;
        private String employeeName;
        private String employeeCode;

        private Integer departmentId;
        private String departmentName;

        private String positionName;

        private Integer cycleId;
        private String cycleName;

        private String managerName;
        private String departmentHeadName;

        private String reviewType;
        private String reviewStatus;
        private String reviewDecision;

        private Integer totalScore;
        private Double scorePercent;
        private String performanceLabel;

        private String comments;
        private String recommendation;

        private Date pmSubmittedAt;
        private Date deptHeadSubmittedAt;
        private Date hrApprovedAt;
        private Date updatedAt;
    }
}