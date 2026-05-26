package com.epms.service.impl;

import com.epms.dto.PositionPermissionAuditDto;
import com.epms.dto.PositionPermissionDto;
import com.epms.dto.TeamPermissionImpactPreviewDto;
import com.epms.entity.Position;
import com.epms.entity.PositionPermission;
import com.epms.entity.PositionPermissionAudit;
import com.epms.entity.User;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

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
    public PositionPermissionDto getMyPermissions() {
        User user = getCurrentUserOrNull();

        if (user == null || user.getPosition() == null || user.getPosition().getId() == null) {
            return new PositionPermissionDto();
        }

        return getByPositionId(user.getPosition().getId());
    }

    @Override
    @Transactional(readOnly = true)
    public PositionPermissionDto getByPositionId(Integer positionId) {
        Position position = findPosition(positionId);

        PositionPermissionDto dto = permissionRepository.findByPositionId(positionId)
                .map(this::toDto)
                .orElseGet(PositionPermissionDto::new);

        attachPositionMeta(dto, position);

        return dto;
    }

    @Override
    @Transactional
    public PositionPermissionDto save(Integer positionId, PositionPermissionDto dto) {
        Position position = findPosition(positionId);
        Integer editorId = safeCurrentUserId();
        User editor = editorId == null ? null : userRepository.findById(editorId).orElse(null);

        PositionPermission permission = permissionRepository.findByPositionId(positionId)
                .orElseGet(() -> {
                    PositionPermission created = new PositionPermission();
                    created.setPositionId(positionId);
                    return created;
                });

        normalizeTeamAssignmentPermissions(dto);

        List<PositionPermissionAudit> auditRows = buildAuditRows(
                permission,
                dto,
                position,
                editor
        );

        applyDto(permission, dto);
        permission.setPositionId(positionId);
        permission.normalizeNullBooleans();

        PositionPermission saved = permissionRepository.save(permission);

        if (!auditRows.isEmpty()) {
            auditRepository.saveAll(auditRows);
        }

        PositionPermissionDto response = toDto(saved);
        attachPositionMeta(response, position);

        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PositionPermissionAuditDto> getAudit(Integer positionId) {
        findPosition(positionId);

        return auditRepository.findByPositionIdOrderByEditedAtDesc(positionId)
                .stream()
                .map(this::toAuditDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TeamPermissionImpactPreviewDto previewImpact(Integer positionId, PositionPermissionDto dto) {
        findPosition(positionId);
        return teamPermissionImpactService.previewImpact(positionId, dto == null ? new PositionPermissionDto() : dto);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean currentUserHasPermission(String permissionField) {
        if (permissionField == null || permissionField.isBlank()) {
            return false;
        }

        User user = getCurrentUserOrNull();

        if (user == null || user.getPosition() == null || user.getPosition().getId() == null) {
            return false;
        }

        PositionPermission permission = permissionRepository
                .findByPositionId(user.getPosition().getId())
                .orElse(null);

        if (permission == null) {
            return false;
        }

        return hasPermission(permission, permissionField);
    }

    @Override
    public void assertCurrentUserHasPermission(String permissionField) {
        if (!currentUserHasPermission(permissionField)) {
            throw new AccessDeniedException("Your position does not have permission: " + permissionField);
        }
    }

    private Position findPosition(Integer positionId) {
        if (positionId == null) {
            throw new ResourceNotFoundException("Position id is required.");
        }

        return positionRepository.findById(positionId)
                .orElseThrow(() -> new ResourceNotFoundException("Position not found: " + positionId));
    }

    private User getCurrentUserOrNull() {
        Integer userId = safeCurrentUserId();

        if (userId == null) {
            return null;
        }

        return userRepository.findById(userId).orElse(null);
    }

    private Integer safeCurrentUserId() {
        try {
            return SecurityUtils.currentUserId();
        } catch (Exception ignored) {
            return null;
        }
    }

    private void attachPositionMeta(PositionPermissionDto dto, Position position) {
        if (dto == null || position == null) {
            return;
        }

        trySetPositionMeta(dto, position);
    }

    private void trySetPositionMeta(PositionPermissionDto dto, Position position) {
        try {
            PositionPermissionDto.class
                    .getMethod("setPositionId", Integer.class)
                    .invoke(dto, position.getId());
        } catch (Exception ignored) {
            // DTO may not include metadata fields in older branch.
        }

        try {
            PositionPermissionDto.class
                    .getMethod("setPositionTitle", String.class)
                    .invoke(dto, position.getPositionTitle());
        } catch (Exception ignored) {
            // DTO may not include metadata fields in older branch.
        }
    }

    private boolean hasPermission(PositionPermission pp, String field) {
        return switch (field) {
            case "oneOnOneCreate" -> safe(pp.getOneOnOneCreate());
            case "oneOnOneDeptSelection" -> safe(pp.getOneOnOneDeptSelection());
            case "oneOnOneTeamSelection" -> safe(pp.getOneOnOneTeamSelection());

            case "teamCreate" -> safe(pp.getTeamCreate());
            case "teamEdit" -> safe(pp.getTeamEdit());
            case "teamHistory" -> safe(pp.getTeamHistory());
            case "teamView" -> safe(pp.getTeamView());
            case "teamAssignAsLeader" -> safe(pp.getTeamAssignAsLeader());
            case "teamAssignAsPm" -> safe(pp.getTeamAssignAsPm());
            case "teamAssignAsMember" -> safe(pp.getTeamAssignAsMember());

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
            case "continuousFeedbackGive" -> safe(pp.getContinuousFeedbackGive());

            case "departmentCrud" -> safe(pp.getDepartmentCrud());
            case "departmentComparisonView" -> safe(pp.getDepartmentComparisonView());
            case "positionCrud" -> safe(pp.getPositionCrud());
            case "employeeCrud" -> safe(pp.getEmployeeCrud());
            case "employeeExcelImport" -> safe(pp.getEmployeeExcelImport());

            default -> false;
        };
    }

    private PositionPermissionDto toDto(PositionPermission pp) {
        if (pp == null) {
            return new PositionPermissionDto();
        }

        pp.normalizeNullBooleans();

        return PositionPermissionDto.builder()
                .oneOnOneCreate(safe(pp.getOneOnOneCreate()))
                .oneOnOneDeptSelection(safe(pp.getOneOnOneDeptSelection()))
                .oneOnOneTeamSelection(safe(pp.getOneOnOneTeamSelection()))

                .teamCreate(safe(pp.getTeamCreate()))
                .teamEdit(safe(pp.getTeamEdit()))
                .teamHistory(safe(pp.getTeamHistory()))
                .teamView(safe(pp.getTeamView()))
                .teamAssignAsLeader(safe(pp.getTeamAssignAsLeader()))
                .teamAssignAsPm(safe(pp.getTeamAssignAsPm()))
                .teamAssignAsMember(safe(pp.getTeamAssignAsMember()))

                .pipCreate(safe(pp.getPipCreate()))
                .pipEdit(safe(pp.getPipEdit()))
                .pipViewAll(safe(pp.getPipViewAll()))

                .appraisalReview(safe(pp.getAppraisalReview()))
                .appraisalApprove(safe(pp.getAppraisalApprove()))
                .appraisalView(safe(pp.getAppraisalView()))
                .appraisalScoreInput(safe(pp.getAppraisalScoreInput()))
                .appraisalSign(safe(pp.getAppraisalSign()))

                .kpiCreate(safe(pp.getKpiCreate()))
                .kpiEdit(safe(pp.getKpiEdit()))
                .kpiScore(safe(pp.getKpiScore()))
                .kpiView(safe(pp.getKpiView()))
                .kpiInput(safe(pp.getKpiInput()))

                .selfAssessmentView(safe(pp.getSelfAssessmentView()))
                .selfAssessmentInput(safe(pp.getSelfAssessmentInput()))
                .selfAssessmentLock(safe(pp.getSelfAssessmentLock()))
                .selfAssessmentSign(safe(pp.getSelfAssessmentSign()))

                .feedbackFormCreate(safe(pp.getFeedbackFormCreate()))
                .feedbackSend(safe(pp.getFeedbackSend()))
                .continuousFeedbackView(safe(pp.getContinuousFeedbackView()))
                .continuousFeedbackGive(safe(pp.getContinuousFeedbackGive()))

                .departmentCrud(safe(pp.getDepartmentCrud()))
                .departmentComparisonView(safe(pp.getDepartmentComparisonView()))
                .positionCrud(safe(pp.getPositionCrud()))
                .employeeCrud(safe(pp.getEmployeeCrud()))
                .employeeExcelImport(safe(pp.getEmployeeExcelImport()))
                .build();
    }

    private void applyDto(PositionPermission pp, PositionPermissionDto dto) {
        PositionPermissionDto safeDto = dto == null ? new PositionPermissionDto() : dto;

        pp.setOneOnOneCreate(safe(safeDto.getOneOnOneCreate()));
        pp.setOneOnOneDeptSelection(safe(safeDto.getOneOnOneDeptSelection()));
        pp.setOneOnOneTeamSelection(safe(safeDto.getOneOnOneTeamSelection()));

        pp.setTeamCreate(safe(safeDto.getTeamCreate()));
        pp.setTeamEdit(safe(safeDto.getTeamEdit()));
        pp.setTeamHistory(safe(safeDto.getTeamHistory()));
        pp.setTeamView(safe(safeDto.getTeamView()));
        pp.setTeamAssignAsLeader(safe(safeDto.getTeamAssignAsLeader()));
        pp.setTeamAssignAsPm(safe(safeDto.getTeamAssignAsPm()));
        pp.setTeamAssignAsMember(safe(safeDto.getTeamAssignAsMember()));

        pp.setPipCreate(safe(safeDto.getPipCreate()));
        pp.setPipEdit(safe(safeDto.getPipEdit()));
        pp.setPipViewAll(safe(safeDto.getPipViewAll()));

        pp.setAppraisalReview(safe(safeDto.getAppraisalReview()));
        pp.setAppraisalApprove(safe(safeDto.getAppraisalApprove()));
        pp.setAppraisalView(safe(safeDto.getAppraisalView()));
        pp.setAppraisalScoreInput(safe(safeDto.getAppraisalScoreInput()));
        pp.setAppraisalSign(safe(safeDto.getAppraisalSign()));

        pp.setKpiCreate(safe(safeDto.getKpiCreate()));
        pp.setKpiEdit(safe(safeDto.getKpiEdit()));
        pp.setKpiScore(safe(safeDto.getKpiScore()));
        pp.setKpiView(safe(safeDto.getKpiView()));
        pp.setKpiInput(safe(safeDto.getKpiInput()));

        pp.setSelfAssessmentView(safe(safeDto.getSelfAssessmentView()));
        pp.setSelfAssessmentInput(safe(safeDto.getSelfAssessmentInput()));
        pp.setSelfAssessmentLock(safe(safeDto.getSelfAssessmentLock()));
        pp.setSelfAssessmentSign(safe(safeDto.getSelfAssessmentSign()));

        pp.setFeedbackFormCreate(safe(safeDto.getFeedbackFormCreate()));
        pp.setFeedbackSend(safe(safeDto.getFeedbackSend()));
        pp.setContinuousFeedbackView(safe(safeDto.getContinuousFeedbackView()));
        pp.setContinuousFeedbackGive(safe(safeDto.getContinuousFeedbackGive()));

        pp.setDepartmentCrud(safe(safeDto.getDepartmentCrud()));
        pp.setDepartmentComparisonView(safe(safeDto.getDepartmentComparisonView()));
        pp.setPositionCrud(safe(safeDto.getPositionCrud()));
        pp.setEmployeeCrud(safe(safeDto.getEmployeeCrud()));
        pp.setEmployeeExcelImport(safe(safeDto.getEmployeeExcelImport()));
    }

    private List<PositionPermissionAudit> buildAuditRows(
            PositionPermission oldPermission,
            PositionPermissionDto newDto,
            Position position,
            User editor
    ) {
        List<PositionPermissionAudit> rows = new ArrayList<>();

        addAudit(rows, position, editor, "oneOnOneCreate", oldPermission.getOneOnOneCreate(), newDto.getOneOnOneCreate());
        addAudit(rows, position, editor, "oneOnOneDeptSelection", oldPermission.getOneOnOneDeptSelection(), newDto.getOneOnOneDeptSelection());
        addAudit(rows, position, editor, "oneOnOneTeamSelection", oldPermission.getOneOnOneTeamSelection(), newDto.getOneOnOneTeamSelection());

        addAudit(rows, position, editor, "teamCreate", oldPermission.getTeamCreate(), newDto.getTeamCreate());
        addAudit(rows, position, editor, "teamEdit", oldPermission.getTeamEdit(), newDto.getTeamEdit());
        addAudit(rows, position, editor, "teamHistory", oldPermission.getTeamHistory(), newDto.getTeamHistory());
        addAudit(rows, position, editor, "teamView", oldPermission.getTeamView(), newDto.getTeamView());
        addAudit(rows, position, editor, "teamAssignAsLeader", oldPermission.getTeamAssignAsLeader(), newDto.getTeamAssignAsLeader());
        addAudit(rows, position, editor, "teamAssignAsPm", oldPermission.getTeamAssignAsPm(), newDto.getTeamAssignAsPm());
        addAudit(rows, position, editor, "teamAssignAsMember", oldPermission.getTeamAssignAsMember(), newDto.getTeamAssignAsMember());

        addAudit(rows, position, editor, "pipCreate", oldPermission.getPipCreate(), newDto.getPipCreate());
        addAudit(rows, position, editor, "pipEdit", oldPermission.getPipEdit(), newDto.getPipEdit());
        addAudit(rows, position, editor, "pipViewAll", oldPermission.getPipViewAll(), newDto.getPipViewAll());

        addAudit(rows, position, editor, "appraisalReview", oldPermission.getAppraisalReview(), newDto.getAppraisalReview());
        addAudit(rows, position, editor, "appraisalApprove", oldPermission.getAppraisalApprove(), newDto.getAppraisalApprove());
        addAudit(rows, position, editor, "appraisalView", oldPermission.getAppraisalView(), newDto.getAppraisalView());
        addAudit(rows, position, editor, "appraisalScoreInput", oldPermission.getAppraisalScoreInput(), newDto.getAppraisalScoreInput());
        addAudit(rows, position, editor, "appraisalSign", oldPermission.getAppraisalSign(), newDto.getAppraisalSign());

        addAudit(rows, position, editor, "kpiCreate", oldPermission.getKpiCreate(), newDto.getKpiCreate());
        addAudit(rows, position, editor, "kpiEdit", oldPermission.getKpiEdit(), newDto.getKpiEdit());
        addAudit(rows, position, editor, "kpiScore", oldPermission.getKpiScore(), newDto.getKpiScore());
        addAudit(rows, position, editor, "kpiView", oldPermission.getKpiView(), newDto.getKpiView());
        addAudit(rows, position, editor, "kpiInput", oldPermission.getKpiInput(), newDto.getKpiInput());

        addAudit(rows, position, editor, "selfAssessmentView", oldPermission.getSelfAssessmentView(), newDto.getSelfAssessmentView());
        addAudit(rows, position, editor, "selfAssessmentInput", oldPermission.getSelfAssessmentInput(), newDto.getSelfAssessmentInput());
        addAudit(rows, position, editor, "selfAssessmentLock", oldPermission.getSelfAssessmentLock(), newDto.getSelfAssessmentLock());
        addAudit(rows, position, editor, "selfAssessmentSign", oldPermission.getSelfAssessmentSign(), newDto.getSelfAssessmentSign());

        addAudit(rows, position, editor, "feedbackFormCreate", oldPermission.getFeedbackFormCreate(), newDto.getFeedbackFormCreate());
        addAudit(rows, position, editor, "feedbackSend", oldPermission.getFeedbackSend(), newDto.getFeedbackSend());
        addAudit(rows, position, editor, "continuousFeedbackView", oldPermission.getContinuousFeedbackView(), newDto.getContinuousFeedbackView());
        addAudit(rows, position, editor, "continuousFeedbackGive", oldPermission.getContinuousFeedbackGive(), newDto.getContinuousFeedbackGive());

        addAudit(rows, position, editor, "departmentCrud", oldPermission.getDepartmentCrud(), newDto.getDepartmentCrud());
        addAudit(rows, position, editor, "departmentComparisonView", oldPermission.getDepartmentComparisonView(), newDto.getDepartmentComparisonView());
        addAudit(rows, position, editor, "positionCrud", oldPermission.getPositionCrud(), newDto.getPositionCrud());
        addAudit(rows, position, editor, "employeeCrud", oldPermission.getEmployeeCrud(), newDto.getEmployeeCrud());
        addAudit(rows, position, editor, "employeeExcelImport", oldPermission.getEmployeeExcelImport(), newDto.getEmployeeExcelImport());

        return rows;
    }

    private void addAudit(
            List<PositionPermissionAudit> rows,
            Position position,
            User editor,
            String columnName,
            Boolean oldValue,
            Boolean newValue
    ) {
        String oldText = boolText(oldValue);
        String newText = boolText(newValue);

        if (Objects.equals(oldText, newText)) {
            return;
        }

        PositionPermissionAudit audit = new PositionPermissionAudit();
        audit.setPositionId(position.getId());
        audit.setPositionTitleSnapshot(position.getPositionTitle());
        audit.setColumnName(columnName);
        audit.setOldValue(oldText);
        audit.setNewValue(newText);
        audit.setEditedBy(editor == null ? null : editor.getId());
        audit.setEditedByName(editor == null ? null : safeName(editor));

        rows.add(audit);
    }

    private PositionPermissionAuditDto toAuditDto(PositionPermissionAudit audit) {
        return PositionPermissionAuditDto.builder()
                .id(audit.getId())
                .positionId(audit.getPositionId())
                .positionTitleSnapshot(audit.getPositionTitleSnapshot())
                .columnName(audit.getColumnName())
                .oldValue(audit.getOldValue())
                .newValue(audit.getNewValue())
                .editedBy(audit.getEditedBy())
                .editedByName(audit.getEditedByName())
                .editedAt(audit.getEditedAt())
                .build();
    }

    private void normalizeTeamAssignmentPermissions(PositionPermissionDto dto) {
        if (dto == null) {
            return;
        }

        boolean leader = safe(dto.getTeamAssignAsLeader());
        boolean pm = safe(dto.getTeamAssignAsPm());
        boolean member = safe(dto.getTeamAssignAsMember());

        if (leader) {
            dto.setTeamAssignAsPm(false);
            dto.setTeamAssignAsMember(false);
            return;
        }

        if (pm) {
            dto.setTeamAssignAsLeader(false);
            dto.setTeamAssignAsMember(false);
            return;
        }

        if (member) {
            dto.setTeamAssignAsLeader(false);
            dto.setTeamAssignAsPm(false);
        }
    }

    private Boolean safe(Boolean value) {
        return Boolean.TRUE.equals(value);
    }

    private String boolText(Boolean value) {
        return Boolean.TRUE.equals(value) ? "1" : "0";
    }

    private String safeName(User user) {
        if (user == null) {
            return null;
        }

        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName();
        }

        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            return user.getEmail();
        }

        return "User #" + user.getId();
    }
}