package com.epms.controller;

import com.epms.dto.EvaluatorConfigDTO;
import com.epms.dto.FeedbackAssignmentGenerationResponse;
import com.epms.dto.FeedbackCampaignActivationReadinessResponse;
import com.epms.dto.FeedbackCampaignCloseRequest;
import com.epms.dto.FeedbackCampaignCreateRequest;
import com.epms.dto.FeedbackCampaignMonitoringDtos.FeedbackCampaignMonitoringResponse;
import com.epms.dto.FeedbackCampaignMonitoringDtos.MonitoringActivityItemDto;
import com.epms.dto.FeedbackCampaignEarlyCloseRequest;
import com.epms.dto.FeedbackCampaignEarlyCloseReviewRequest;
import com.epms.dto.FeedbackCampaignResponse;
import com.epms.dto.FeedbackCampaignTargetsRequest;
import com.epms.dto.FeedbackCampaignTargetsResponse;
import com.epms.dto.FeedbackCampaignQuestionReviewResponse;
import com.epms.dto.FeedbackCampaignQuestionReviewSaveRequest;
import com.epms.dto.FeedbackTargetCandidateResponse;
import com.epms.dto.FeedbackManualAssignmentRequest;
import com.epms.dto.FeedbackReminderRequest;
import com.epms.dto.FeedbackReminderResponse;
import com.epms.dto.FeedbackCampaignScoringConfigRequest;
import com.epms.dto.FeedbackCampaignScoringConfigResponse;
import com.epms.dto.GenericApiResponse;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackRequest;
import com.epms.exception.UnauthorizedActionException;
import com.epms.security.SecurityUtils;
import com.epms.service.FeedbackCampaignService;
import com.epms.service.FeedbackCampaignMonitoringService;
import com.epms.service.FeedbackCampaignQuestionReviewService;
import com.epms.service.FeedbackEvaluationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/v1/feedback/campaigns")
@RequiredArgsConstructor
public class FeedbackCampaignController {

    private final FeedbackCampaignService feedbackCampaignService;
    private final FeedbackCampaignMonitoringService feedbackCampaignMonitoringService;
    private final FeedbackCampaignQuestionReviewService questionReviewService;
    private final FeedbackEvaluationService feedbackEvaluationService;

    @PostMapping
    public ResponseEntity<GenericApiResponse<FeedbackCampaignResponse>> createCampaign(
            @Valid @RequestBody FeedbackCampaignCreateRequest request) {
        ensureHrOrAdmin();
        FeedbackCampaign campaign = feedbackCampaignService.createCampaign(request, SecurityUtils.currentUserId().longValue());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GenericApiResponse.success("Feedback campaign created successfully", mapCampaign(campaign)));
    }

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<FeedbackCampaignResponse>>> getCampaigns() {
        ensureHrOrAdmin();
        List<FeedbackCampaignResponse> response = feedbackCampaignService.getAllCampaigns().stream()
                .map(this::mapCampaign)
                .toList();
        return ResponseEntity.ok(GenericApiResponse.success("Feedback campaigns retrieved successfully", response));
    }

    @GetMapping("/early-close/requests")
    public ResponseEntity<GenericApiResponse<List<FeedbackCampaignResponse>>> getPendingEarlyCloseRequests() {
        ensureAdmin();
        List<FeedbackCampaignResponse> response = feedbackCampaignService.getPendingEarlyCloseRequests().stream()
                .map(this::mapCampaign)
                .toList();
        return ResponseEntity.ok(GenericApiResponse.success("Pending early close requests retrieved successfully", response));
    }

    @GetMapping("/target-candidates")
    public ResponseEntity<GenericApiResponse<List<FeedbackTargetCandidateResponse>>> getTargetCandidates(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer currentDepartmentId,
            @RequestParam(required = false) Integer parentDepartmentId,
            @RequestParam(required = false) Integer teamId,
            @RequestParam(required = false) String readiness,
            @RequestParam(required = false) String levelCode,
            @RequestParam(required = false) Long campaignId
    ) {
        ensureHrOrAdmin();
        Long excludedOwnerUserId = campaignId == null
                ? SecurityUtils.currentUserId().longValue()
                : feedbackCampaignService.getCampaignById(campaignId).getCreatedByUserId();
        List<FeedbackTargetCandidateResponse> response = feedbackCampaignService.searchTargetCandidates(
                search, currentDepartmentId, parentDepartmentId, teamId, readiness, levelCode, excludedOwnerUserId
        );
        return ResponseEntity.ok(GenericApiResponse.success("Target candidates retrieved successfully", response));
    }

    @GetMapping("/{campaignId}")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignResponse>> getCampaign(@PathVariable Long campaignId) {
        ensureHrOrAdmin();
        return ResponseEntity.ok(GenericApiResponse.success(
                "Feedback campaign retrieved successfully",
                mapCampaign(feedbackCampaignService.getCampaignById(campaignId))
        ));
    }

    @GetMapping("/{campaignId}/targets")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignTargetsResponse>> getCampaignTargets(@PathVariable Long campaignId) {
        ensureHrOrAdmin();
        return ResponseEntity.ok(GenericApiResponse.success(
                "Feedback campaign targets retrieved successfully",
                feedbackCampaignService.getCampaignTargets(campaignId)
        ));
    }

    @PutMapping("/{campaignId}/targets")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignTargetsResponse>> updateCampaignTargets(
            @PathVariable Long campaignId,
            @Valid @RequestBody FeedbackCampaignTargetsRequest request
    ) {
        ensureHrOrAdmin();
        return ResponseEntity.ok(GenericApiResponse.success(
                "Feedback campaign targets saved successfully",
                feedbackCampaignService.updateTargets(campaignId, request.getEmployeeIds(), SecurityUtils.currentUserId().longValue())
        ));
    }

    @PostMapping("/{campaignId}/targets")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignResponse>> assignTargets(
            @PathVariable Long campaignId,
            @Valid @RequestBody FeedbackCampaignTargetsRequest request
    ) {
        ensureHrOrAdmin();
        feedbackCampaignService.replaceTargets(campaignId, request.getEmployeeIds(), SecurityUtils.currentUserId().longValue());
        FeedbackCampaign campaign = feedbackCampaignService.getCampaignById(campaignId);
        return ResponseEntity.ok(GenericApiResponse.success(
                "Feedback campaign targets saved successfully",
                mapCampaign(campaign)
        ));
    }

    @GetMapping("/{campaignId}/scoring-config")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignScoringConfigResponse>> getScoringConfig(@PathVariable Long campaignId) {
        ensureHrOrAdmin();
        return ResponseEntity.ok(GenericApiResponse.success(
                "Campaign scoring configuration retrieved successfully",
                feedbackCampaignService.getScoringConfig(campaignId)
        ));
    }

    @PutMapping("/{campaignId}/scoring-config")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignScoringConfigResponse>> updateScoringConfig(
            @PathVariable Long campaignId,
            @Valid @RequestBody FeedbackCampaignScoringConfigRequest request
    ) {
        ensureHrOrAdmin();
        return ResponseEntity.ok(GenericApiResponse.success(
                "Campaign scoring configuration saved successfully",
                feedbackCampaignService.updateScoringConfig(campaignId, request, SecurityUtils.currentUserId().longValue())
        ));
    }

    @PostMapping("/{campaignId}/assignments/generate")
    public ResponseEntity<GenericApiResponse<FeedbackAssignmentGenerationResponse>> generateAssignments(
            @PathVariable Long campaignId,
            @Valid @RequestBody EvaluatorConfigDTO request
    ) {
        ensureHrOrAdmin();
        FeedbackAssignmentGenerationResponse response = feedbackEvaluationService.generateAssignments(campaignId, request, SecurityUtils.currentUserId().longValue());
        return ResponseEntity.ok(GenericApiResponse.success("Evaluator assignments generated successfully", response));
    }



    @PostMapping("/{campaignId}/assignments/preview")
    public ResponseEntity<GenericApiResponse<FeedbackAssignmentGenerationResponse>> previewAssignments(
            @PathVariable Long campaignId,
            @Valid @RequestBody EvaluatorConfigDTO request
    ) {
        ensureHrOrAdmin();
        FeedbackAssignmentGenerationResponse response = feedbackEvaluationService.previewAssignments(campaignId, request);
        return ResponseEntity.ok(GenericApiResponse.success("Evaluator rule preview calculated successfully", response));
    }

    @GetMapping("/{campaignId}/assignments/preview")
    public ResponseEntity<GenericApiResponse<FeedbackAssignmentGenerationResponse>> getAssignmentPreview(
            @PathVariable Long campaignId
    ) {
        ensureHrOrAdmin();
        FeedbackAssignmentGenerationResponse response = feedbackEvaluationService.getAssignmentPreview(campaignId);
        return ResponseEntity.ok(GenericApiResponse.success("Evaluator assignment preview retrieved successfully", response));
    }

    @PostMapping("/{campaignId}/assignments/manual")
    public ResponseEntity<GenericApiResponse<FeedbackAssignmentGenerationResponse>> addManualAssignment(
            @PathVariable Long campaignId,
            @Valid @RequestBody FeedbackManualAssignmentRequest request
    ) {
        ensureHrOrAdmin();
        FeedbackAssignmentGenerationResponse response = feedbackEvaluationService.addManualAssignment(campaignId, request, SecurityUtils.currentUserId().longValue());
        return ResponseEntity.ok(GenericApiResponse.success("Manual evaluator assignment added successfully", response));
    }

    @DeleteMapping("/{campaignId}/assignments/{assignmentId}")
    public ResponseEntity<GenericApiResponse<FeedbackAssignmentGenerationResponse>> removeAssignment(
            @PathVariable Long campaignId,
            @PathVariable Long assignmentId
    ) {
        ensureHrOrAdmin();
        FeedbackAssignmentGenerationResponse response = feedbackEvaluationService.removeAssignment(campaignId, assignmentId, SecurityUtils.currentUserId().longValue());
        return ResponseEntity.ok(GenericApiResponse.success("Evaluator assignment removed successfully", response));
    }




    @GetMapping("/{campaignId}/activation-readiness")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignActivationReadinessResponse>> getActivationReadiness(@PathVariable Long campaignId) {
        ensureHrOrAdmin();
        return ResponseEntity.ok(GenericApiResponse.success(
                "Campaign activation readiness retrieved successfully",
                feedbackCampaignService.getActivationReadiness(campaignId)
        ));
    }

    @GetMapping("/{campaignId}/monitoring")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignMonitoringResponse>> getCampaignMonitoring(@PathVariable Long campaignId) {
        ensureHrOrAdmin();
        return ResponseEntity.ok(GenericApiResponse.success(
                "Campaign monitoring retrieved successfully",
                feedbackCampaignMonitoringService.getMonitoring(campaignId)
        ));
    }

    @GetMapping("/{campaignId}/monitoring/activity")
    public ResponseEntity<GenericApiResponse<List<MonitoringActivityItemDto>>> getCampaignMonitoringActivity(@PathVariable Long campaignId) {
        ensureHrOrAdmin();
        return ResponseEntity.ok(GenericApiResponse.success(
                "Campaign monitoring activity retrieved successfully",
                feedbackCampaignMonitoringService.getActivity(campaignId)
        ));
    }

    @GetMapping(value = "/{campaignId}/monitoring/export", produces = "text/csv")
    public ResponseEntity<String> exportCampaignMonitoringCsv(@PathVariable Long campaignId) {
        ensureHrOrAdmin();
        String csv = feedbackCampaignMonitoringService.exportMonitoringCsv(campaignId, SecurityUtils.currentUserId().longValue());
        String filename = "360-monitoring-campaign-" + campaignId + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(new MediaType("text", "csv"))
                .body(csv);
    }

    @GetMapping("/{campaignId}/question-review")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignQuestionReviewResponse>> getQuestionReview(@PathVariable Long campaignId) {
        ensureHrOrAdmin();
        return ResponseEntity.ok(GenericApiResponse.success(
                "Campaign question review retrieved successfully",
                questionReviewService.getQuestionReview(campaignId)
        ));
    }

    @PostMapping("/{campaignId}/question-review/resolve")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignQuestionReviewResponse>> resolveQuestionReview(@PathVariable Long campaignId) {
        ensureHrOrAdmin();
        return ResponseEntity.ok(GenericApiResponse.success(
                "Campaign questions resolved from active rules",
                questionReviewService.resolveQuestionReview(campaignId)
        ));
    }

    @PutMapping("/{campaignId}/question-review")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignQuestionReviewResponse>> saveQuestionReview(
            @PathVariable Long campaignId,
            @Valid @RequestBody FeedbackCampaignQuestionReviewSaveRequest request
    ) {
        ensureHrOrAdmin();
        return ResponseEntity.ok(GenericApiResponse.success(
                "Campaign question selection saved successfully",
                questionReviewService.saveQuestionReview(campaignId, request, SecurityUtils.currentUserId().longValue())
        ));
    }

    @PostMapping("/{campaignId}/activate")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignResponse>> activateCampaign(@PathVariable Long campaignId) {
        ensureHrOrAdmin();
        FeedbackCampaign campaign = feedbackCampaignService.activateCampaign(campaignId, SecurityUtils.currentUserId().longValue());
        return ResponseEntity.ok(GenericApiResponse.success(
                "Feedback campaign activated successfully",
                mapCampaign(campaign)
        ));
    }

    @PostMapping("/{campaignId}/close")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignResponse>> closeCampaign(
            @PathVariable Long campaignId,
            @RequestBody(required = false) FeedbackCampaignCloseRequest request
    ) {
        ensureHrOrAdmin();
        FeedbackCampaign campaign = feedbackCampaignService.closeCampaignWithReadiness(
                campaignId,
                request,
                SecurityUtils.currentUserId().longValue()
        );
        return ResponseEntity.ok(GenericApiResponse.success(
                "Feedback campaign closed successfully",
                mapCampaign(campaign)
        ));
    }

    @PostMapping("/{campaignId}/early-close/request")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignResponse>> requestEarlyClose(
            @PathVariable Long campaignId,
            @Valid @RequestBody FeedbackCampaignEarlyCloseRequest request
    ) {
        ensureHrOrAdmin();
        FeedbackCampaign campaign = feedbackCampaignService.requestEarlyClose(
                campaignId,
                SecurityUtils.currentUserId().longValue(),
                request.getReason()
        );
        return ResponseEntity.ok(GenericApiResponse.success(
                "Early close request sent for HR Admin approval",
                mapCampaign(campaign)
        ));
    }

    @PostMapping("/{campaignId}/early-close/approve")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignResponse>> approveEarlyClose(
            @PathVariable Long campaignId,
            @Valid @RequestBody FeedbackCampaignEarlyCloseReviewRequest request
    ) {
        ensureAdmin();
        FeedbackCampaign campaign = feedbackCampaignService.approveEarlyClose(
                campaignId,
                SecurityUtils.currentUserId().longValue(),
                request.getReviewNote()
        );
        return ResponseEntity.ok(GenericApiResponse.success(
                "Early close approved and campaign closed",
                mapCampaign(campaign)
        ));
    }

    @PostMapping("/{campaignId}/early-close/reject")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignResponse>> rejectEarlyClose(
            @PathVariable Long campaignId,
            @Valid @RequestBody FeedbackCampaignEarlyCloseReviewRequest request
    ) {
        ensureAdmin();
        FeedbackCampaign campaign = feedbackCampaignService.rejectEarlyClose(
                campaignId,
                SecurityUtils.currentUserId().longValue(),
                request.getReviewNote()
        );
        return ResponseEntity.ok(GenericApiResponse.success(
                "Early close request rejected",
                mapCampaign(campaign)
        ));
    }

    @PutMapping("/{campaignId}")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignResponse>> updateDraftCampaign(
            @PathVariable Long campaignId,
            @Valid @RequestBody FeedbackCampaignCreateRequest request
    ) {
        ensureHrOrAdmin();
        FeedbackCampaign campaign = feedbackCampaignService.updateDraftCampaign(
                campaignId,
                request,
                SecurityUtils.currentUserId().longValue()
        );
        return ResponseEntity.ok(GenericApiResponse.success(
                "Feedback campaign draft updated successfully",
                mapCampaign(campaign)
        ));
    }

    @PostMapping("/{campaignId}/ready")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignResponse>> markReadyToActivate(@PathVariable Long campaignId) {
        ensureHrOrAdmin();
        FeedbackCampaign campaign = feedbackCampaignService.markReadyToActivate(campaignId, SecurityUtils.currentUserId().longValue());
        return ResponseEntity.ok(GenericApiResponse.success(
                "Feedback campaign setup validated and marked ready to activate",
                mapCampaign(campaign)
        ));
    }

    @PostMapping("/{campaignId}/publish")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignResponse>> publishCampaign(@PathVariable Long campaignId) {
        ensureHrOrAdmin();
        FeedbackCampaign campaign = feedbackCampaignService.publishCampaign(campaignId, SecurityUtils.currentUserId().longValue());
        return ResponseEntity.ok(GenericApiResponse.success(
                "Feedback campaign published successfully",
                mapCampaign(campaign)
        ));
    }

    @DeleteMapping("/{campaignId}")
    public ResponseEntity<GenericApiResponse<Void>> deleteDraftCampaign(@PathVariable Long campaignId) {
        ensureHrOrAdmin();
        feedbackCampaignService.deleteDraftCampaign(campaignId, SecurityUtils.currentUserId().longValue());
        return ResponseEntity.ok(GenericApiResponse.success(
                "Draft feedback campaign deleted successfully",
                null
        ));
    }

    @PostMapping("/{campaignId}/reminders")
    public ResponseEntity<GenericApiResponse<FeedbackReminderResponse>> sendPendingReminders(@PathVariable Long campaignId) {
        ensureHrOrAdmin();
        FeedbackReminderResponse response = feedbackCampaignService.sendPendingEvaluatorReminders(
                campaignId,
                SecurityUtils.currentUserId().longValue()
        );
        return ResponseEntity.ok(GenericApiResponse.success(
                "Pending evaluator reminders sent successfully",
                response
        ));
    }

    @PostMapping("/{campaignId}/reminders/scoped")
    public ResponseEntity<GenericApiResponse<FeedbackReminderResponse>> sendScopedReminders(
            @PathVariable Long campaignId,
            @Valid @RequestBody FeedbackReminderRequest request
    ) {
        ensureHrOrAdmin();
        FeedbackReminderResponse response = feedbackCampaignService.sendScopedEvaluatorReminders(
                campaignId,
                request,
                SecurityUtils.currentUserId().longValue()
        );
        return ResponseEntity.ok(GenericApiResponse.success(
                "Scoped evaluator reminders sent successfully",
                response
        ));
    }

    private FeedbackCampaignResponse mapCampaign(FeedbackCampaign campaign) {
        List<FeedbackRequest> requests = feedbackCampaignService.getRequestsForCampaign(campaign.getId());

        return FeedbackCampaignResponse.builder()
                .id(campaign.getId())
                .name(campaign.getName())
                .campaignType(campaign.getCampaignType())
                .reviewYear(campaign.getReviewYear())
                .startDate(campaign.getStartDate())
                .endDate(campaign.getEndDate())
                .startAt(campaign.getStartAt())
                .endAt(campaign.getEndAt())
                .description(campaign.getDescription())
                .instructions(campaign.getInstructions())
                .status(campaign.getStatus().name())
                .formId(null)
                .autoSubmitCompletedDraftsOnClose(Boolean.TRUE.equals(campaign.getAutoSubmitCompletedDraftsOnClose()))
                .managerFeedbackAnonymous(Boolean.TRUE.equals(campaign.getManagerFeedbackAnonymous()))
                .peerFeedbackAnonymous(Boolean.TRUE.equals(campaign.getPeerFeedbackAnonymous()))
                .subordinateFeedbackAnonymous(Boolean.TRUE.equals(campaign.getSubordinateFeedbackAnonymous()))
                .selfFeedbackAnonymous(Boolean.TRUE.equals(campaign.getSelfFeedbackAnonymous()))
                .redistributeMissingRelationshipWeight(!Boolean.FALSE.equals(campaign.getRedistributeMissingRelationshipWeight()))
                .earlyCloseRequestStatus(campaign.getEarlyCloseRequestStatus() == null ? "NONE" : campaign.getEarlyCloseRequestStatus().name())
                .earlyCloseRequestedAt(campaign.getEarlyCloseRequestedAt())
                .earlyCloseRequestedByUserId(campaign.getEarlyCloseRequestedByUserId())
                .earlyCloseRequestReason(campaign.getEarlyCloseRequestReason())
                .earlyCloseReviewedAt(campaign.getEarlyCloseReviewedAt())
                .earlyCloseReviewedByUserId(campaign.getEarlyCloseReviewedByUserId())
                .earlyCloseReviewReason(campaign.getEarlyCloseReviewReason())
                .closedAt(campaign.getClosedAt())
                .closedByUserId(campaign.getClosedByUserId())
                .closeReason(campaign.getCloseReason())
                .closedEarly(Boolean.TRUE.equals(campaign.getClosedEarly()))
                .createdBy(campaign.getCreatedByUserId())
                .createdAt(campaign.getCreatedAt())
                .targetCount(requests.size())
                .assignmentCount((int) feedbackCampaignService.countAssignments(campaign.getId()))
                .targetEmployeeIds(requests.stream().map(FeedbackRequest::getTargetEmployeeId).sorted().toList())
                .build();
    }

    private void ensureHrOrAdmin() {
        boolean authorized = currentNormalizedRoleNames().stream().anyMatch(this::isHrOrAdminRole);
        if (!authorized) {
            throw new UnauthorizedActionException("Only HR or HR Admin can manage feedback campaigns.");
        }
    }

    private void ensureAdmin() {
        boolean authorized = currentNormalizedRoleNames().stream().anyMatch(this::isAdminRole);
        if (!authorized) {
            throw new UnauthorizedActionException("Only HR Admin can review feedback early-close requests.");
        }
    }

    private List<String> currentNormalizedRoleNames() {
        var principal = SecurityUtils.currentUser();
        List<String> roles = new ArrayList<>();

        if (principal.getRoles() != null) {
            principal.getRoles().stream()
                    .filter(role -> role != null && !role.isBlank())
                    .map(this::normalizeRole)
                    .forEach(roles::add);
        }

        if (principal.getPermissions() != null) {
            principal.getPermissions().stream()
                    .filter(permission -> permission != null && !permission.isBlank())
                    .map(this::normalizeRole)
                    .forEach(roles::add);
        }

        if (principal.getDashboard() != null && !principal.getDashboard().isBlank()) {
            roles.add(normalizeRole(principal.getDashboard()));
        }

        if (principal.getPosition() != null && !principal.getPosition().isBlank()) {
            roles.add(normalizeRole(principal.getPosition()));
        }

        if (principal.getAuthorities() != null) {
            principal.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .filter(role -> role != null && !role.isBlank())
                    .map(this::normalizeRole)
                    .forEach(roles::add);
        }

        return roles.stream().distinct().toList();
    }

    private boolean isHrOrAdminRole(String role) {
        return isAdminRole(role)
                || role.equals("HR")
                || role.equals("HR_ADMIN")
                || role.equals("HUMAN_RESOURCES")
                || role.equals("HUMAN_RESOURCE")
                || role.equals("HUMAN_RESOURCES_MANAGER")
                || role.equals("HUMAN_RESOURCE_MANAGER")
                || role.equals("HR_MANAGER")
                || role.equals("HR_DASHBOARD")
                || role.equals("HRADMIN_DASHBOARD")
                || role.equals("PEOPLE")
                || role.equals("PEOPLE_OPS")
                || role.equals("TALENT")
                || role.equals("CHRO")
                || role.contains("_HR_")
                || role.startsWith("HR_")
                || role.endsWith("_HR")
                || role.contains("HUMAN_RESOURCE");
    }

    private boolean isAdminRole(String role) {
        return role.equals("HRADMIN") || role.equals("SUPER_ADMIN") || role.equals("SYSTEM_ADMIN") || role.equals("HRADMIN_DASHBOARD");
    }

    private String normalizeRole(String role) {
        return role
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase(Locale.ROOT);
    }
}
