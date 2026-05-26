package com.epms.service;

import com.epms.dto.EmployeeAssessmentDtos;
import com.epms.dto.SelfAssessmentScoreBandDtos.ScoreBandAuditResponse;
import com.epms.dto.SelfAssessmentScoreBandDtos.ScoreBandRequest;
import com.epms.dto.SelfAssessmentScoreBandDtos.ScoreBandResponse;
import com.epms.dto.SelfAssessmentScoreBandDtos.ScoreTableResponse;
import com.epms.dto.SelfAssessmentScoreBandDtos.ScoreTableUpdateRequest;
import com.epms.entity.EmployeeAssessment;
import com.epms.entity.SelfAssessmentScoreBand;
import com.epms.entity.SelfAssessmentScoreBandAudit;
import com.epms.exception.BadRequestException;
import com.epms.exception.UnauthorizedActionException;
import com.epms.repository.AssessmentFormDefinitionRepository;
import com.epms.repository.EmployeeAssessmentRepository;
import com.epms.repository.SelfAssessmentScoreBandAuditRepository;
import com.epms.repository.SelfAssessmentScoreBandRepository;
import com.epms.security.SecurityUtils;
import com.epms.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class SelfAssessmentScoreBandService {

    private static final int REQUIRED_ROW_COUNT = 5;

    private final SelfAssessmentScoreBandRepository scoreBandRepository;
    private final SelfAssessmentScoreBandAuditRepository auditRepository;
    private final AssessmentFormDefinitionRepository assessmentFormRepository;
    private final EmployeeAssessmentRepository employeeAssessmentRepository;

    @Transactional(readOnly = true)
    public ScoreTableResponse getTable() {
        ensureDefaultsReadonlySafe();
        LocalDateTime now = LocalDateTime.now();
        int activeFormCount = assessmentFormRepository
                .findByActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByCreatedAtDesc(now, now)
                .size();

        return ScoreTableResponse.builder()
                .bands(scoreBandRepository.findAllByOrderBySortOrderAsc().stream().map(this::toResponse).toList())
                .audits(getAudit())
                .activeFormExists(activeFormCount > 0)
                .activeFormCount(activeFormCount)
                .build();
    }

    @Transactional(readOnly = true)
    public List<ScoreBandAuditResponse> getAudit() {
        return auditRepository.findTop100ByOrderByChangedAtDesc()
                .stream()
                .map(this::toAuditResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EmployeeAssessmentDtos.AssessmentScoreBandResponse> getActiveBandsForAssessment() {
        ensureDefaultsReadonlySafe();

        return scoreBandRepository.findAllByOrderBySortOrderAsc()
                .stream()
                .map(band -> EmployeeAssessmentDtos.AssessmentScoreBandResponse.builder()
                        .id(band.getId())
                        .minScore(band.getMinScore())
                        .maxScore(band.getMaxScore())
                        .label(band.getLabel())
                        .description(band.getDescription())
                        .sortOrder(band.getSortOrder())
                        .build())
                .toList();
    }

    public ScoreTableResponse updateTable(ScoreTableUpdateRequest request) {
        assertHrOnly();
        ensureDefaults();

        String reason = clean(request == null ? null : request.getReason());

        if (reason == null) {
            throw new BadRequestException("Reason is required before updating the score table.");
        }

        if (request.getBands() == null || request.getBands().size() != REQUIRED_ROW_COUNT) {
            throw new BadRequestException("Score table must contain exactly 5 rows.");
        }

        List<ScoreBandRequest> incoming = request.getBands()
                .stream()
                .sorted(Comparator.comparing(ScoreBandRequest::getSortOrder, Comparator.nullsLast(Integer::compareTo)))
                .toList();

        validateScoreTable(incoming);

        List<SelfAssessmentScoreBand> existingBands = scoreBandRepository.findAllByOrderBySortOrderAsc();
        Map<Integer, SelfAssessmentScoreBand> existingById = existingBands.stream()
                .filter(band -> band.getId() != null)
                .collect(Collectors.toMap(SelfAssessmentScoreBand::getId, band -> band));

        Map<Integer, SelfAssessmentScoreBand> existingBySortOrder = existingBands.stream()
                .filter(band -> band.getSortOrder() != null)
                .collect(Collectors.toMap(SelfAssessmentScoreBand::getSortOrder, band -> band, (first, ignored) -> first));

        UserPrincipal currentUser = SecurityUtils.currentUser();
        List<SelfAssessmentScoreBandAudit> audits = new ArrayList<>();

        for (ScoreBandRequest row : incoming) {
            SelfAssessmentScoreBand band = row.getId() == null
                    ? existingBySortOrder.get(row.getSortOrder())
                    : existingById.get(row.getId());

            if (band == null) {
                throw new BadRequestException("Score table row not found. Please refresh the page and try again.");
            }

            collectAuditIfChanged(
                    audits,
                    band,
                    currentUser,
                    "Score",
                    formatScore(band.getMinScore(), band.getMaxScore()),
                    formatScore(row.getMinScore(), row.getMaxScore()),
                    reason
            );

            collectAuditIfChanged(
                    audits,
                    band,
                    currentUser,
                    "Explanation Title",
                    safe(band.getLabel()),
                    safe(row.getLabel()),
                    reason
            );

            collectAuditIfChanged(
                    audits,
                    band,
                    currentUser,
                    "Explanation Details",
                    safe(band.getDescription()),
                    safe(row.getDescription()),
                    reason
            );

            band.setMinScore(row.getMinScore());
            band.setMaxScore(row.getMaxScore());
            band.setLabel(clean(row.getLabel()));
            band.setDescription(clean(row.getDescription()));
            band.setSortOrder(row.getSortOrder());
        }

        if (audits.isEmpty()) {
            throw new BadRequestException("No changes were found in the score table.");
        }

        scoreBandRepository.saveAll(existingBands);
        auditRepository.saveAll(audits);
        refreshAssessmentPerformanceLabels();

        return getTable();
    }

    private void validateScoreTable(List<ScoreBandRequest> rows) {
        Set<Integer> sortOrders = new HashSet<>();

        for (ScoreBandRequest row : rows) {
            if (row.getSortOrder() == null || row.getSortOrder() < 1 || row.getSortOrder() > REQUIRED_ROW_COUNT) {
                throw new BadRequestException("Each score row must have a valid order from 1 to 5.");
            }

            if (!sortOrders.add(row.getSortOrder())) {
                throw new BadRequestException("Duplicate score row order found.");
            }

            if (row.getMinScore() == null || row.getMaxScore() == null) {
                throw new BadRequestException("Every score row needs minimum and maximum score.");
            }

            if (row.getMinScore() == 0 && row.getMaxScore() == 0) {
                throw new BadRequestException("Score cannot be 00-00. Please fix the highlighted score range before saving.");
            }

            if (row.getMinScore() < 0 || row.getMaxScore() > 100) {
                throw new BadRequestException("Score range must stay between 0 and 100.");
            }

            if (row.getMinScore() > row.getMaxScore()) {
                throw new BadRequestException("Minimum score cannot be higher than maximum score.");
            }

            if (clean(row.getLabel()) == null) {
                throw new BadRequestException("Explanation title is required.");
            }

            if (clean(row.getDescription()) == null) {
                throw new BadRequestException("Explanation details are required.");
            }
        }

        ScoreBandRequest top = rows.get(0);
        ScoreBandRequest bottom = rows.get(rows.size() - 1);

        if (top.getMaxScore() != 100) {
            throw new BadRequestException("The highest score row must end at 100.");
        }

        if (bottom.getMinScore() != 0) {
            throw new BadRequestException("The lowest score row must start from 0.");
        }

        for (int index = 0; index < rows.size() - 1; index++) {
            ScoreBandRequest upper = rows.get(index);
            ScoreBandRequest lower = rows.get(index + 1);

            if (upper.getMinScore() != lower.getMaxScore() + 1) {
                throw new BadRequestException(
                        "Score ranges must be continuous with no overlap or gap. Please check row "
                                + upper.getSortOrder()
                                + " and row "
                                + lower.getSortOrder()
                                + "."
                );
            }
        }
    }

    private void refreshAssessmentPerformanceLabels() {
        List<SelfAssessmentScoreBand> bands = scoreBandRepository.findAllByOrderBySortOrderAsc();
        List<EmployeeAssessment> assessments = employeeAssessmentRepository.findAll();

        for (EmployeeAssessment assessment : assessments) {
            double score = assessment.getScorePercent() == null ? 0.0 : assessment.getScorePercent();

            String label = bands.stream()
                    .filter(band -> score >= band.getMinScore() && score <= band.getMaxScore())
                    .findFirst()
                    .map(SelfAssessmentScoreBand::getLabel)
                    .orElse("Not scored");

            assessment.setPerformanceLabel(label);
        }

        employeeAssessmentRepository.saveAll(assessments);
    }

    private void collectAuditIfChanged(
            List<SelfAssessmentScoreBandAudit> audits,
            SelfAssessmentScoreBand band,
            UserPrincipal user,
            String changedPart,
            String oldValue,
            String newValue,
            String reason
    ) {
        if (Objects.equals(safe(oldValue), safe(newValue))) {
            return;
        }

        SelfAssessmentScoreBandAudit audit = new SelfAssessmentScoreBandAudit();

        audit.setBandId(band.getId());
        audit.setSortOrder(band.getSortOrder());
        audit.setChangedByUserId(user.getId());
        audit.setChangedByName(user.getFullName() == null || user.getFullName().isBlank()
                ? user.getUsername()
                : user.getFullName());
        audit.setChangedByRole(String.join(", ", user.getRoles() == null ? List.of() : user.getRoles()));
        audit.setChangedPart(changedPart);
        audit.setOldValue(oldValue);
        audit.setNewValue(newValue);
        audit.setReason(reason);

        audits.add(audit);
    }

    private void assertHrOnly() {
        UserPrincipal user = SecurityUtils.currentUser();

        boolean isHr = user.getRoles() != null && user.getRoles()
                .stream()
                .map(this::canonicalRole)
                .anyMatch("HR"::equals);

        String dashboardRole = canonicalRole(user.getDashboard());
        boolean dashboardIsHr = "HR_DASHBOARD".equals(dashboardRole) || "HR".equals(dashboardRole);

        if (!isHr && !dashboardIsHr) {
            throw new UnauthorizedActionException("Only HR can edit the self-assessment score table.");
        }
    }

    private void ensureDefaultsReadonlySafe() {
        if (scoreBandRepository.count() < REQUIRED_ROW_COUNT) {
            ensureDefaults();
        }
    }

    private void ensureDefaults() {
        if (scoreBandRepository.count() >= REQUIRED_ROW_COUNT) {
            return;
        }

        scoreBandRepository.deleteAll();

        List<SelfAssessmentScoreBand> defaults = new ArrayList<>();

        defaults.add(defaultBand(86, 100, "Outstanding",
                "Performance exceptional and far exceeds expectations. Consistently demonstrates excellent standards in all job requirements.", 1));
        defaults.add(defaultBand(71, 85, "Good",
                "Performance is consistent. Clearly meets essential requirements of job.", 2));
        defaults.add(defaultBand(60, 70, "Meet Requirement",
                "Performance is satisfactory. Meets requirements of the job.", 3));
        defaults.add(defaultBand(40, 59, "Need Improvement",
                "Performance is inconsistent. Meets requirements of job occasionally. Supervision and training is required for most problem areas.", 4));
        defaults.add(defaultBand(0, 39, "Unsatisfactory",
                "Performance does not meet the minimum requirement of the job.", 5));

        scoreBandRepository.saveAll(defaults);
    }

    private SelfAssessmentScoreBand defaultBand(
            Integer minScore,
            Integer maxScore,
            String label,
            String description,
            Integer sortOrder
    ) {
        SelfAssessmentScoreBand band = new SelfAssessmentScoreBand();

        band.setMinScore(minScore);
        band.setMaxScore(maxScore);
        band.setLabel(label);
        band.setDescription(description);
        band.setSortOrder(sortOrder);

        return band;
    }

    private ScoreBandResponse toResponse(SelfAssessmentScoreBand band) {
        return ScoreBandResponse.builder()
                .id(band.getId())
                .minScore(band.getMinScore())
                .maxScore(band.getMaxScore())
                .label(band.getLabel())
                .description(band.getDescription())
                .sortOrder(band.getSortOrder())
                .build();
    }

    private ScoreBandAuditResponse toAuditResponse(SelfAssessmentScoreBandAudit audit) {
        return ScoreBandAuditResponse.builder()
                .id(audit.getId())
                .bandId(audit.getBandId())
                .sortOrder(audit.getSortOrder())
                .changedByUserId(audit.getChangedByUserId())
                .changedByName(audit.getChangedByName())
                .changedByRole(audit.getChangedByRole())
                .changedPart(audit.getChangedPart())
                .oldValue(audit.getOldValue())
                .newValue(audit.getNewValue())
                .reason(audit.getReason())
                .changedAt(audit.getChangedAt())
                .build();
    }

    private String formatScore(Integer min, Integer max) {
        return String.format("%02d-%d", min == null ? 0 : min, max == null ? 0 : max);
    }

    private String canonicalRole(String value) {
        if (value == null) {
            return "";
        }

        return value
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("([a-z])([A-Z])", "$1_$2")
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase(Locale.ROOT);
    }

    private String clean(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        return value.trim();
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }
}