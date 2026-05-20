package com.epms.service.impl;

import com.epms.dto.PositionPermissionAuditDto;
import com.epms.dto.PositionPermissionDto;
import com.epms.entity.Position;
import com.epms.entity.PositionPermission;
import com.epms.entity.PositionPermissionAudit;
import com.epms.entity.Role;
import com.epms.entity.User;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.PositionPermissionAuditRepository;
import com.epms.repository.PositionPermissionRepository;
import com.epms.repository.PositionRepository;
import com.epms.repository.UserRepository;
import com.epms.security.SecurityUtils;
import com.epms.service.PositionPermissionService;
import com.epms.service.TeamPermissionImpactService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PositionPermissionServiceImpl implements PositionPermissionService {

    private final PositionPermissionRepository permissionRepository;
    private final PositionPermissionAuditRepository auditRepository;
    private final PositionRepository positionRepository;
    private final UserRepository userRepository;
    private final TeamPermissionImpactService teamPermissionImpactService;

    @Override
    @Transactional(readOnly = true)
    public PositionPermissionDto getByPositionId(Integer positionId) {
        return permissionRepository.findByPositionId(positionId)
                .map(this::toDto)
                .orElseGet(PositionPermissionDto::new);
    }

    @Override
    @Transactional(readOnly = true)
    public PositionPermissionDto getMyPermissions() {
        Integer userId = safeCurrentUserId();
        if (userId == null) return new PositionPermissionDto();

        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getPosition() == null) return new PositionPermissionDto();

        return getByPositionId(user.getPosition().getId());
    }

    @Override
    @Transactional
    public PositionPermissionDto savePermissions(Integer positionId, PositionPermissionDto dto) {
        Position position = positionRepository.findById(positionId)
                .orElseThrow(() -> new ResourceNotFoundException("Position not found: " + positionId));

        Integer editorId = safeCurrentUserId();
        String positionTitle = position.getPositionTitle();

        PositionPermission existing = permissionRepository.findByPositionId(positionId)
                .orElseGet(() -> {
                    PositionPermission fresh = new PositionPermission();
                    fresh.setPosition(position);
                    return fresh;
                });

        PositionPermissionDto sanitized = sanitizeForRole(position, dto == null ? new PositionPermissionDto() : dto);
        normalizeTeamAssignmentPermissions(sanitized);

        PositionPermissionDto previousPermissions = toDto(existing);
        List<PositionPermissionAudit> auditRows = buildAuditRows(existing, sanitized, positionId, positionTitle, editorId);

        applyDto(existing, sanitized);
        permissionRepository.save(existing);

        if (!auditRows.isEmpty()) auditRepository.saveAll(auditRows);

        User editor = editorId == null ? null : userRepository.findById(editorId).orElse(null);
        teamPermissionImpactService.applyImpact(positionId, previousPermissions, sanitized, editor);

        return toDto(existing);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PositionPermissionAuditDto> getAuditHistory(Integer positionId) {
        return auditRepository.findByPositionIdOrderByEditedAtDesc(positionId)
                .stream()
                .map(this::toAuditDto)
                .toList();
    }

    @Override
    public void assertCurrentUserHasPermission(String permissionField) {
        if (!currentUserHasPermission(permissionField)) {
            throw new AccessDeniedException("Your position does not have permission: " + permissionField);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public boolean currentUserHasPermission(String permissionField) {
        Integer userId = safeCurrentUserId();
        if (userId == null) return false;

        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getPosition() == null) return false;

        PositionPermission pp = permissionRepository.findByPositionId(user.getPosition().getId()).orElse(null);
        if (pp == null) return false;

        return hasPermission(pp, permissionField);
    }

    private boolean hasPermission(PositionPermission pp, String permissionField) {
        return switch (permissionField) {
            case "oneOnOneCreate" -> safe(pp.getOneOnOneCreate());
            case "oneOnOneDeptSelection" -> safe(pp.getOneOnOneDeptSelection());
            case "oneOnOneTeamSelection" -> safe(pp.getOneOnOneTeamSelection());
            case "teamCreate" -> safe(pp.getTeamCreate());
            case "teamEdit" -> safe(pp.getTeamEdit());
            case "teamHistory" -> safe(pp.getTeamHistory());
            case "teamView" -> safe(pp.getTeamView());
            case "teamAssignAsLeader", "teamAssignAsPm", "teamAssignAsMember" -> permissionField.equals(resolveTeamAssignmentPermission(pp));
            case "pipCreate" -> safe(pp.getPipCreate());
            case "pipEdit" -> safe(pp.getPipEdit());
            case "pipViewAll" -> safe(pp.getPipViewAll());
            case "appraisalReview" -> safe(pp.getAppraisalReview());
            case "appraisalApprove" -> safe(pp.getAppraisalApprove());
            case "appraisalView" -> safe(pp.getAppraisalView());
            case "appraisalScoreInput" -> safe(pp.getAppraisalScoreInput());
            case "appraisalSign" -> safe(pp.getAppraisalSign());
            case "kpiCreate" -> safe(pp.getKpiCreate());
            case "kpiEdit" -> safe(pp.getKpiEdit());
            case "kpiScore" -> safe(pp.getKpiScore());
            case "kpiView" -> safe(pp.getKpiView());
            case "kpiInput" -> safe(pp.getKpiInput());
            case "selfAssessmentView" -> safe(pp.getSelfAssessmentView());
            case "selfAssessmentInput" -> safe(pp.getSelfAssessmentInput());
            case "selfAssessmentLock" -> safe(pp.getSelfAssessmentLock());
            case "selfAssessmentSign" -> safe(pp.getSelfAssessmentSign());
            case "feedbackFormCreate" -> safe(pp.getFeedbackFormCreate());
            case "feedbackSend" -> safe(pp.getFeedbackSend());
            case "continuousFeedbackView" -> safe(pp.getContinuousFeedbackView());
            case "continuousFeedbackGive" -> safe(pp.getContinuousFeedbackGive()) || safe(pp.getFeedbackSend());
            case "departmentCrud" -> safe(pp.getDepartmentCrud());
            case "departmentComparisonView" -> safe(pp.getDepartmentComparisonView());
            case "positionCrud" -> safe(pp.getPositionCrud());
            case "employeeCrud" -> safe(pp.getEmployeeCrud());
            case "employeeExcelImport" -> safe(pp.getEmployeeExcelImport());
            default -> false;
        };
    }

    private PositionPermissionDto sanitizeForRole(Position position, PositionPermissionDto source) {
        PositionPermissionDto dto = copyDto(source);
        Set<String> allowed = allowedFieldsForRole(position);
        List<String> invalidEnabled = enabledFields(dto).stream()
                .filter(field -> !allowed.contains(field))
                .toList();

        if (!invalidEnabled.isEmpty()) {
            throw new BadRequestException("These permissions are not available for the selected role: " + String.join(", ", invalidEnabled));
        }

        return dto;
    }

    private Set<String> allowedFieldsForRole(Position position) {
        String role = normalizeRole(position == null || position.getRole() == null ? null : position.getRole().getName());
        Set<String> fields = new LinkedHashSet<>();

        switch (role) {
            case "ADMIN" -> fields.addAll(allFields());
            case "HR" -> fields.addAll(Set.of(
                    "oneOnOneCreate", "oneOnOneDeptSelection",
                    "pipViewAll",
                    "appraisalReview", "appraisalApprove", "appraisalView",
                    "kpiCreate", "kpiEdit", "kpiView",
                    "selfAssessmentView", "selfAssessmentInput", "selfAssessmentLock", "selfAssessmentSign",
                    "feedbackFormCreate",
                    "continuousFeedbackView",
                    "departmentCrud", "departmentComparisonView",
                    "positionCrud", "employeeCrud", "employeeExcelImport"
            ));
            case "DEPARTMENT_HEAD", "DEPARTMENTHEAD" -> fields.addAll(Set.of(
                    "teamCreate", "teamHistory",
                    "oneOnOneCreate", "oneOnOneDeptSelection",
                    "pipCreate", "pipViewAll",
                    "appraisalReview", "appraisalView", "appraisalSign",
                    "kpiView",
                    "selfAssessmentView",
                    "continuousFeedbackGive", "feedbackSend"
            ));
            case "MANAGER" -> fields.addAll(Set.of(
                    "oneOnOneCreate", "oneOnOneTeamSelection",
                    "pipCreate", "pipEdit",
                    "appraisalReview", "appraisalView", "appraisalScoreInput", "appraisalSign",
                    "kpiInput", "kpiScore",
                    "selfAssessmentSign",
                    "continuousFeedbackGive", "feedbackSend"
            ));
            case "EMPLOYEE" -> fields.addAll(Set.of(
                    "teamView", "teamAssignAsLeader", "teamAssignAsMember",
                    "oneOnOneCreate",
                    "appraisalView",
                    "kpiView",
                    "selfAssessmentView", "selfAssessmentInput", "selfAssessmentSign",
                    "continuousFeedbackView", "continuousFeedbackGive", "feedbackSend"
            ));
            case "CEO" -> fields.addAll(Set.of(
                    "appraisalView", "departmentComparisonView", "kpiView"
            ));
            default -> throw new BadRequestException("Please connect this position to one of the fixed roles before assigning permissions.");
        }

        return fields;
    }

    private Set<String> allFields() {
        return Set.of(
                "oneOnOneCreate", "oneOnOneDeptSelection", "oneOnOneTeamSelection",
                "teamCreate", "teamEdit", "teamHistory", "teamView", "teamAssignAsLeader", "teamAssignAsPm", "teamAssignAsMember",
                "pipCreate", "pipEdit", "pipViewAll",
                "appraisalReview", "appraisalApprove", "appraisalView", "appraisalScoreInput", "appraisalSign",
                "kpiCreate", "kpiEdit", "kpiScore", "kpiView", "kpiInput",
                "selfAssessmentView", "selfAssessmentInput", "selfAssessmentLock", "selfAssessmentSign",
                "feedbackFormCreate", "feedbackSend", "continuousFeedbackView", "continuousFeedbackGive",
                "departmentCrud", "departmentComparisonView", "positionCrud", "employeeCrud", "employeeExcelImport"
        );
    }

    private List<String> enabledFields(PositionPermissionDto dto) {
        List<String> fields = new ArrayList<>();
        if (safe(dto.getOneOnOneCreate())) fields.add("oneOnOneCreate");
        if (safe(dto.getOneOnOneDeptSelection())) fields.add("oneOnOneDeptSelection");
        if (safe(dto.getOneOnOneTeamSelection())) fields.add("oneOnOneTeamSelection");
        if (safe(dto.getTeamCreate())) fields.add("teamCreate");
        if (safe(dto.getTeamEdit())) fields.add("teamEdit");
        if (safe(dto.getTeamHistory())) fields.add("teamHistory");
        if (safe(dto.getTeamView())) fields.add("teamView");
        if (safe(dto.getTeamAssignAsLeader())) fields.add("teamAssignAsLeader");
        if (safe(dto.getTeamAssignAsPm())) fields.add("teamAssignAsPm");
        if (safe(dto.getTeamAssignAsMember())) fields.add("teamAssignAsMember");
        if (safe(dto.getPipCreate())) fields.add("pipCreate");
        if (safe(dto.getPipEdit())) fields.add("pipEdit");
        if (safe(dto.getPipViewAll())) fields.add("pipViewAll");
        if (safe(dto.getAppraisalReview())) fields.add("appraisalReview");
        if (safe(dto.getAppraisalApprove())) fields.add("appraisalApprove");
        if (safe(dto.getAppraisalView())) fields.add("appraisalView");
        if (safe(dto.getAppraisalScoreInput())) fields.add("appraisalScoreInput");
        if (safe(dto.getAppraisalSign())) fields.add("appraisalSign");
        if (safe(dto.getKpiCreate())) fields.add("kpiCreate");
        if (safe(dto.getKpiEdit())) fields.add("kpiEdit");
        if (safe(dto.getKpiScore())) fields.add("kpiScore");
        if (safe(dto.getKpiView())) fields.add("kpiView");
        if (safe(dto.getKpiInput())) fields.add("kpiInput");
        if (safe(dto.getSelfAssessmentView())) fields.add("selfAssessmentView");
        if (safe(dto.getSelfAssessmentInput())) fields.add("selfAssessmentInput");
        if (safe(dto.getSelfAssessmentLock())) fields.add("selfAssessmentLock");
        if (safe(dto.getSelfAssessmentSign())) fields.add("selfAssessmentSign");
        if (safe(dto.getFeedbackFormCreate())) fields.add("feedbackFormCreate");
        if (safe(dto.getFeedbackSend())) fields.add("feedbackSend");
        if (safe(dto.getContinuousFeedbackView())) fields.add("continuousFeedbackView");
        if (safe(dto.getContinuousFeedbackGive())) fields.add("continuousFeedbackGive");
        if (safe(dto.getDepartmentCrud())) fields.add("departmentCrud");
        if (safe(dto.getDepartmentComparisonView())) fields.add("departmentComparisonView");
        if (safe(dto.getPositionCrud())) fields.add("positionCrud");
        if (safe(dto.getEmployeeCrud())) fields.add("employeeCrud");
        if (safe(dto.getEmployeeExcelImport())) fields.add("employeeExcelImport");
        return fields;
    }

    private PositionPermissionDto toDto(PositionPermission pp) {
        PositionPermissionDto dto = new PositionPermissionDto();
        dto.setOneOnOneCreate(safe(pp.getOneOnOneCreate()));
        dto.setOneOnOneDeptSelection(safe(pp.getOneOnOneDeptSelection()));
        dto.setOneOnOneTeamSelection(safe(pp.getOneOnOneTeamSelection()));
        dto.setTeamCreate(safe(pp.getTeamCreate()));
        dto.setTeamEdit(safe(pp.getTeamEdit()));
        dto.setTeamHistory(safe(pp.getTeamHistory()));
        dto.setTeamView(safe(pp.getTeamView()));
        dto.setTeamAssignAsLeader(safe(pp.getTeamAssignAsLeader()));
        dto.setTeamAssignAsPm(safe(pp.getTeamAssignAsPm()));
        dto.setTeamAssignAsMember(safe(pp.getTeamAssignAsMember()));
        dto.setPipCreate(safe(pp.getPipCreate()));
        dto.setPipEdit(safe(pp.getPipEdit()));
        dto.setPipViewAll(safe(pp.getPipViewAll()));
        dto.setAppraisalReview(safe(pp.getAppraisalReview()));
        dto.setAppraisalApprove(safe(pp.getAppraisalApprove()));
        dto.setAppraisalView(safe(pp.getAppraisalView()));
        dto.setAppraisalScoreInput(safe(pp.getAppraisalScoreInput()));
        dto.setAppraisalSign(safe(pp.getAppraisalSign()));
        dto.setKpiCreate(safe(pp.getKpiCreate()));
        dto.setKpiEdit(safe(pp.getKpiEdit()));
        dto.setKpiScore(safe(pp.getKpiScore()));
        dto.setKpiView(safe(pp.getKpiView()));
        dto.setKpiInput(safe(pp.getKpiInput()));
        dto.setSelfAssessmentView(safe(pp.getSelfAssessmentView()));
        dto.setSelfAssessmentInput(safe(pp.getSelfAssessmentInput()));
        dto.setSelfAssessmentLock(safe(pp.getSelfAssessmentLock()));
        dto.setSelfAssessmentSign(safe(pp.getSelfAssessmentSign()));
        dto.setFeedbackFormCreate(safe(pp.getFeedbackFormCreate()));
        dto.setFeedbackSend(safe(pp.getFeedbackSend()));
        dto.setContinuousFeedbackView(safe(pp.getContinuousFeedbackView()));
        dto.setContinuousFeedbackGive(safe(pp.getContinuousFeedbackGive()));
        dto.setDepartmentCrud(safe(pp.getDepartmentCrud()));
        dto.setDepartmentComparisonView(safe(pp.getDepartmentComparisonView()));
        dto.setPositionCrud(safe(pp.getPositionCrud()));
        dto.setEmployeeCrud(safe(pp.getEmployeeCrud()));
        dto.setEmployeeExcelImport(safe(pp.getEmployeeExcelImport()));
        return dto;
    }

    private PositionPermissionDto copyDto(PositionPermissionDto source) {
        PositionPermissionDto dto = new PositionPermissionDto();
        dto.setOneOnOneCreate(safe(source.getOneOnOneCreate()));
        dto.setOneOnOneDeptSelection(safe(source.getOneOnOneDeptSelection()));
        dto.setOneOnOneTeamSelection(safe(source.getOneOnOneTeamSelection()));
        dto.setTeamCreate(safe(source.getTeamCreate()));
        dto.setTeamEdit(safe(source.getTeamEdit()));
        dto.setTeamHistory(safe(source.getTeamHistory()));
        dto.setTeamView(safe(source.getTeamView()));
        dto.setTeamAssignAsLeader(safe(source.getTeamAssignAsLeader()));
        dto.setTeamAssignAsPm(safe(source.getTeamAssignAsPm()));
        dto.setTeamAssignAsMember(safe(source.getTeamAssignAsMember()));
        dto.setPipCreate(safe(source.getPipCreate()));
        dto.setPipEdit(safe(source.getPipEdit()));
        dto.setPipViewAll(safe(source.getPipViewAll()));
        dto.setAppraisalReview(safe(source.getAppraisalReview()));
        dto.setAppraisalApprove(safe(source.getAppraisalApprove()));
        dto.setAppraisalView(safe(source.getAppraisalView()));
        dto.setAppraisalScoreInput(safe(source.getAppraisalScoreInput()));
        dto.setAppraisalSign(safe(source.getAppraisalSign()));
        dto.setKpiCreate(safe(source.getKpiCreate()));
        dto.setKpiEdit(safe(source.getKpiEdit()));
        dto.setKpiScore(safe(source.getKpiScore()));
        dto.setKpiView(safe(source.getKpiView()));
        dto.setKpiInput(safe(source.getKpiInput()));
        dto.setSelfAssessmentView(safe(source.getSelfAssessmentView()));
        dto.setSelfAssessmentInput(safe(source.getSelfAssessmentInput()));
        dto.setSelfAssessmentLock(safe(source.getSelfAssessmentLock()));
        dto.setSelfAssessmentSign(safe(source.getSelfAssessmentSign()));
        dto.setFeedbackFormCreate(safe(source.getFeedbackFormCreate()));
        dto.setFeedbackSend(safe(source.getFeedbackSend()));
        dto.setContinuousFeedbackView(safe(source.getContinuousFeedbackView()));
        dto.setContinuousFeedbackGive(safe(source.getContinuousFeedbackGive()));
        dto.setDepartmentCrud(safe(source.getDepartmentCrud()));
        dto.setDepartmentComparisonView(safe(source.getDepartmentComparisonView()));
        dto.setPositionCrud(safe(source.getPositionCrud()));
        dto.setEmployeeCrud(safe(source.getEmployeeCrud()));
        dto.setEmployeeExcelImport(safe(source.getEmployeeExcelImport()));
        return dto;
    }

    private void applyDto(PositionPermission pp, PositionPermissionDto dto) {
        pp.setOneOnOneCreate(safe(dto.getOneOnOneCreate()));
        pp.setOneOnOneDeptSelection(safe(dto.getOneOnOneDeptSelection()));
        pp.setOneOnOneTeamSelection(safe(dto.getOneOnOneTeamSelection()));
        pp.setTeamCreate(safe(dto.getTeamCreate()));
        pp.setTeamEdit(safe(dto.getTeamEdit()));
        pp.setTeamHistory(safe(dto.getTeamHistory()));
        pp.setTeamView(safe(dto.getTeamView()));
        pp.setTeamAssignAsLeader(safe(dto.getTeamAssignAsLeader()));
        pp.setTeamAssignAsPm(safe(dto.getTeamAssignAsPm()));
        pp.setTeamAssignAsMember(safe(dto.getTeamAssignAsMember()));
        pp.setPipCreate(safe(dto.getPipCreate()));
        pp.setPipEdit(safe(dto.getPipEdit()));
        pp.setPipViewAll(safe(dto.getPipViewAll()));
        pp.setAppraisalReview(safe(dto.getAppraisalReview()));
        pp.setAppraisalApprove(safe(dto.getAppraisalApprove()));
        pp.setAppraisalView(safe(dto.getAppraisalView()));
        pp.setAppraisalScoreInput(safe(dto.getAppraisalScoreInput()));
        pp.setAppraisalSign(safe(dto.getAppraisalSign()));
        pp.setKpiCreate(safe(dto.getKpiCreate()));
        pp.setKpiEdit(safe(dto.getKpiEdit()));
        pp.setKpiScore(safe(dto.getKpiScore()));
        pp.setKpiView(safe(dto.getKpiView()));
        pp.setKpiInput(safe(dto.getKpiInput()));
        pp.setSelfAssessmentView(safe(dto.getSelfAssessmentView()));
        pp.setSelfAssessmentInput(safe(dto.getSelfAssessmentInput()));
        pp.setSelfAssessmentLock(safe(dto.getSelfAssessmentLock()));
        pp.setSelfAssessmentSign(safe(dto.getSelfAssessmentSign()));
        pp.setFeedbackFormCreate(safe(dto.getFeedbackFormCreate()));
        pp.setFeedbackSend(safe(dto.getFeedbackSend()));
        pp.setContinuousFeedbackView(safe(dto.getContinuousFeedbackView()));
        pp.setContinuousFeedbackGive(safe(dto.getContinuousFeedbackGive()));
        pp.setDepartmentCrud(safe(dto.getDepartmentCrud()));
        pp.setDepartmentComparisonView(safe(dto.getDepartmentComparisonView()));
        pp.setPositionCrud(safe(dto.getPositionCrud()));
        pp.setEmployeeCrud(safe(dto.getEmployeeCrud()));
        pp.setEmployeeExcelImport(safe(dto.getEmployeeExcelImport()));
    }

    private List<PositionPermissionAudit> buildAuditRows(PositionPermission existing, PositionPermissionDto dto, Integer positionId, String positionTitle, Integer editorId) {
        List<PositionPermissionAudit> rows = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        addAuditIfChanged(rows, positionId, positionTitle, "one_on_one_create", existing.getOneOnOneCreate(), dto.getOneOnOneCreate(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "one_on_one_dept_selection", existing.getOneOnOneDeptSelection(), dto.getOneOnOneDeptSelection(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "one_on_one_team_selection", existing.getOneOnOneTeamSelection(), dto.getOneOnOneTeamSelection(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "team_create", existing.getTeamCreate(), dto.getTeamCreate(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "team_edit", existing.getTeamEdit(), dto.getTeamEdit(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "team_history", existing.getTeamHistory(), dto.getTeamHistory(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "team_view", existing.getTeamView(), dto.getTeamView(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "team_assign_as_leader", existing.getTeamAssignAsLeader(), dto.getTeamAssignAsLeader(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "team_assign_as_pm", existing.getTeamAssignAsPm(), dto.getTeamAssignAsPm(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "team_assign_as_member", existing.getTeamAssignAsMember(), dto.getTeamAssignAsMember(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "pip_create", existing.getPipCreate(), dto.getPipCreate(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "pip_edit", existing.getPipEdit(), dto.getPipEdit(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "pip_view_all", existing.getPipViewAll(), dto.getPipViewAll(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "appraisal_review", existing.getAppraisalReview(), dto.getAppraisalReview(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "appraisal_approve", existing.getAppraisalApprove(), dto.getAppraisalApprove(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "appraisal_view", existing.getAppraisalView(), dto.getAppraisalView(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "appraisal_score_input", existing.getAppraisalScoreInput(), dto.getAppraisalScoreInput(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "appraisal_sign", existing.getAppraisalSign(), dto.getAppraisalSign(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "kpi_create", existing.getKpiCreate(), dto.getKpiCreate(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "kpi_edit", existing.getKpiEdit(), dto.getKpiEdit(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "kpi_score", existing.getKpiScore(), dto.getKpiScore(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "kpi_view", existing.getKpiView(), dto.getKpiView(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "kpi_input", existing.getKpiInput(), dto.getKpiInput(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "self_assessment_view", existing.getSelfAssessmentView(), dto.getSelfAssessmentView(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "self_assessment_input", existing.getSelfAssessmentInput(), dto.getSelfAssessmentInput(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "self_assessment_lock", existing.getSelfAssessmentLock(), dto.getSelfAssessmentLock(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "self_assessment_sign", existing.getSelfAssessmentSign(), dto.getSelfAssessmentSign(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "feedback_form_create", existing.getFeedbackFormCreate(), dto.getFeedbackFormCreate(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "feedback_send", existing.getFeedbackSend(), dto.getFeedbackSend(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "continuous_feedback_view", existing.getContinuousFeedbackView(), dto.getContinuousFeedbackView(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "continuous_feedback_give", existing.getContinuousFeedbackGive(), dto.getContinuousFeedbackGive(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "department_crud", existing.getDepartmentCrud(), dto.getDepartmentCrud(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "department_comparison_view", existing.getDepartmentComparisonView(), dto.getDepartmentComparisonView(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "position_crud", existing.getPositionCrud(), dto.getPositionCrud(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "employee_crud", existing.getEmployeeCrud(), dto.getEmployeeCrud(), editorId, now);
        addAuditIfChanged(rows, positionId, positionTitle, "employee_excel_import", existing.getEmployeeExcelImport(), dto.getEmployeeExcelImport(), editorId, now);

        return rows;
    }

    private void addAuditIfChanged(List<PositionPermissionAudit> rows, Integer positionId, String positionTitle, String columnName, Boolean oldBool, Boolean newBool, Integer editorId, LocalDateTime now) {
        boolean oldVal = safe(oldBool);
        boolean newVal = safe(newBool);

        if (!Objects.equals(oldVal, newVal)) {
            PositionPermissionAudit audit = new PositionPermissionAudit();
            audit.setPositionId(positionId);
            audit.setPositionTitleSnapshot(positionTitle);
            audit.setColumnName(columnName);
            audit.setOldValue(oldBool == null ? null : (oldVal ? "1" : "0"));
            audit.setNewValue(newVal ? "1" : "0");
            audit.setEditedBy(editorId);
            audit.setEditedAt(now);
            rows.add(audit);
        }
    }

    private String resolveTeamAssignmentPermission(PositionPermission pp) {
        if (pp == null) return "none";
        if (safe(pp.getTeamAssignAsLeader())) return "teamAssignAsLeader";
        if (safe(pp.getTeamAssignAsPm())) return "teamAssignAsPm";
        if (safe(pp.getTeamAssignAsMember())) return "teamAssignAsMember";
        return "none";
    }

    private void normalizeTeamAssignmentPermissions(PositionPermissionDto dto) {
        if (dto == null) return;
        if (safe(dto.getTeamAssignAsLeader())) {
            dto.setTeamAssignAsPm(false);
            dto.setTeamAssignAsMember(false);
            return;
        }
        if (safe(dto.getTeamAssignAsPm())) {
            dto.setTeamAssignAsLeader(false);
            dto.setTeamAssignAsMember(false);
            return;
        }
        if (safe(dto.getTeamAssignAsMember())) {
            dto.setTeamAssignAsLeader(false);
            dto.setTeamAssignAsPm(false);
        }
    }

    private PositionPermissionAuditDto toAuditDto(PositionPermissionAudit audit) {
        String editorName = null;
        if (audit.getEditedBy() != null) {
            editorName = userRepository.findById(audit.getEditedBy())
                    .map(u -> u.getFullName() != null ? u.getFullName() : u.getEmail())
                    .orElse(null);
        }

        return new PositionPermissionAuditDto(
                audit.getId(),
                audit.getPositionId(),
                audit.getPositionTitleSnapshot(),
                audit.getColumnName(),
                audit.getOldValue(),
                audit.getNewValue(),
                audit.getEditedBy(),
                editorName,
                audit.getEditedAt()
        );
    }

    private String normalizeRole(String value) {
        if (value == null) return "";
        String normalized = value
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("([a-z])([A-Z])", "$1_$2")
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase(Locale.ROOT);
        if (normalized.equals("DEPARTMENTHEAD")) return "DEPARTMENT_HEAD";
        return normalized;
    }

    private boolean safe(Boolean value) {
        return Boolean.TRUE.equals(value);
    }

    private Integer safeCurrentUserId() {
        try {
            return SecurityUtils.currentUserId();
        } catch (Exception ignored) {
            return null;
        }
    }
}
