package com.epms.controller;

import com.epms.dto.FeedbackCampaignSummaryResponse;
import com.epms.dto.FeedbackIntegrationScoreResponse;
import com.epms.dto.FeedbackMyResultResponse;
import com.epms.dto.FeedbackSummaryPublishRequest;
import com.epms.dto.FeedbackTeamSummaryResponse;
import com.epms.dto.GenericApiResponse;
import com.epms.exception.UnauthorizedActionException;
import com.epms.security.SecurityUtils;
import com.epms.service.FeedbackSummaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/feedback")
@RequiredArgsConstructor
public class FeedbackSummaryController {

    private final FeedbackSummaryService feedbackSummaryService;

    @GetMapping("/campaigns/{campaignId}/summary")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignSummaryResponse>> getCampaignSummary(@PathVariable Long campaignId) {
        ensureHrOrAdmin();
        return ResponseEntity.ok(GenericApiResponse.success(
                "Feedback campaign summary retrieved successfully",
                feedbackSummaryService.getCampaignSummary(campaignId)
        ));
    }

    @PostMapping("/campaigns/{campaignId}/summary/recalculate")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignSummaryResponse>> recalculateCampaignSummary(@PathVariable Long campaignId) {
        ensureHrOrAdmin();
        return ResponseEntity.ok(GenericApiResponse.success(
                "Feedback campaign summary recalculated successfully",
                feedbackSummaryService.recalculateCampaignSummary(campaignId)
        ));
    }

    @PostMapping("/campaigns/{campaignId}/summary/publish")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignSummaryResponse>> publishCampaignSummary(
            @PathVariable Long campaignId,
            @RequestBody(required = false) FeedbackSummaryPublishRequest request
    ) {
        ensureHrOrAdmin();
        return ResponseEntity.ok(GenericApiResponse.success(
                "Feedback campaign summary published successfully",
                feedbackSummaryService.publishCampaignSummary(campaignId, SecurityUtils.currentUserId().longValue(), request)
        ));
    }

    @PostMapping("/campaigns/{campaignId}/summary/unpublish")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignSummaryResponse>> unpublishCampaignSummary(@PathVariable Long campaignId) {
        ensureHrOrAdmin();
        return ResponseEntity.ok(GenericApiResponse.success(
                "Feedback campaign summary unpublished successfully",
                feedbackSummaryService.unpublishCampaignSummary(campaignId, SecurityUtils.currentUserId().longValue())
        ));
    }

    @GetMapping("/integration/scores")
    public ResponseEntity<GenericApiResponse<List<FeedbackIntegrationScoreResponse>>> getIntegrationScores(@RequestParam Long campaignId) {
        ensureHrOrAdmin();
        return ResponseEntity.ok(GenericApiResponse.success(
                "360 feedback integration scores retrieved successfully",
                feedbackSummaryService.getIntegrationScores(campaignId)
        ));
    }

    @GetMapping("/integration/scores/employee/{employeeId}")
    public ResponseEntity<GenericApiResponse<List<FeedbackIntegrationScoreResponse>>> getIntegrationScoresForEmployee(@PathVariable Long employeeId) {
        ensureHrOrAdmin();
        return ResponseEntity.ok(GenericApiResponse.success(
                "360 feedback integration scores for employee retrieved successfully",
                feedbackSummaryService.getIntegrationScoresForEmployee(employeeId)
        ));
    }

    @GetMapping("/my-result")
    public ResponseEntity<GenericApiResponse<FeedbackMyResultResponse>> getMyResult() {
        return ResponseEntity.ok(GenericApiResponse.success(
                "Feedback results retrieved successfully",
                feedbackSummaryService.getMyResult(SecurityUtils.currentUserId().longValue())
        ));
    }

    @GetMapping("/team-summary")
    public ResponseEntity<GenericApiResponse<FeedbackTeamSummaryResponse>> getTeamSummary() {
        ensureManagerOrDepartmentHead();
        return ResponseEntity.ok(GenericApiResponse.success(
                "Privacy-safe managed employee feedback summary retrieved successfully",
                feedbackSummaryService.getTeamSummary(SecurityUtils.currentUserId().longValue())
        ));
    }

    private void ensureManagerOrDepartmentHead() {
        List<String> roles = SecurityUtils.currentUser().getRoles();
        String dashboard = normalizeRoleName(SecurityUtils.currentUser().getDashboard());
        boolean authorized = isManagerDashboard(dashboard)
                || isDepartmentHeadDashboard(dashboard)
                || roles != null && roles.stream()
                .map(this::normalizeRoleName)
                .anyMatch(role -> isManagerRole(role) || isDepartmentHeadRole(role));
        if (!authorized) {
            throw new UnauthorizedActionException("Only Managers and Department Heads can access team or department 360 feedback summaries.");
        }
    }

    private void ensureHrOrAdmin() {
        List<String> roles = SecurityUtils.currentUser().getRoles();
        boolean authorized = roles != null && roles.stream()
                .map(this::normalizeRoleName)
                .anyMatch(role -> role.equals("HR") || role.equals("ADMIN") || role.equals("HRADMIN") || role.equals("HR_ADMIN"));
        if (!authorized) {
            throw new UnauthorizedActionException("Only HR or HR Admin can access feedback summaries.");
        }
    }

    private boolean isManagerDashboard(String dashboard) {
        return dashboard.equals("MANAGER_DASHBOARD") || dashboard.equals("PROJECT_MANAGER_DASHBOARD");
    }

    private boolean isDepartmentHeadDashboard(String dashboard) {
        String compact = dashboard.replace("_", "");
        return dashboard.equals("DEPARTMENT_HEAD_DASHBOARD")
                || compact.equals("DEPARTMENT" + "HEAD" + "DASHBOARD")
                || dashboard.equals("DEPT_HEAD_DASHBOARD");
    }

    private boolean isManagerRole(String role) {
        return role.equals("MANAGER") || role.equals("PROJECT_MANAGER") || role.equals("TEAM_MANAGER") || role.equals("TEAM_LEADER") || role.equals("PM");
    }

    private boolean isDepartmentHeadRole(String role) {
        String compact = role.replace("_", "");
        return role.equals("DEPARTMENT_HEAD")
                || compact.equals("DEPARTMENT" + "HEAD")
                || role.equals("DEPT_HEAD")
                || role.equals("HEAD_OF_DEPARTMENT");
    }

    private String normalizeRoleName(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("([a-z])([A-Z])", "$1_$2")
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase();
    }
}
