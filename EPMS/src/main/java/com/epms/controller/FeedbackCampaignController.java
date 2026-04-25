package com.epms.controller;

import com.epms.dto.FeedbackCampaignCreateRequest;
import com.epms.dto.FeedbackCampaignResponse;
import com.epms.dto.GenericApiResponse;
import com.epms.entity.FeedbackCampaign;
import com.epms.exception.UnauthorizedActionException;
import com.epms.security.SecurityUtils;
import com.epms.service.FeedbackCampaignService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/feedback/campaigns")
@RequiredArgsConstructor
public class FeedbackCampaignController {

    private final FeedbackCampaignService feedbackCampaignService;

    @PostMapping
    public ResponseEntity<GenericApiResponse<FeedbackCampaignResponse>> createCampaign(
            @Valid @RequestBody FeedbackCampaignCreateRequest request) {
        ensureHrOrAdmin();
        FeedbackCampaign campaign = feedbackCampaignService.createCampaign(
                request.getName(),
                request.getStartDate(),
                request.getEndDate(),
                request.getStatus().name(),
                SecurityUtils.currentUserId().longValue()
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GenericApiResponse.success("Feedback campaign created successfully", mapCampaign(campaign)));
    }

    @PutMapping("/{campaignId}")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignResponse>> updateCampaign(
            @PathVariable Long campaignId,
            @Valid @RequestBody FeedbackCampaignCreateRequest request) {
        ensureHrOrAdmin();
        FeedbackCampaign campaign = feedbackCampaignService.updateCampaign(
                campaignId,
                request.getName(),
                request.getStartDate(),
                request.getEndDate(),
                request.getStatus().name()
        );
        return ResponseEntity.ok(GenericApiResponse.success("Feedback campaign updated successfully", mapCampaign(campaign)));
    }

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<FeedbackCampaignResponse>>> getCampaigns() {
        ensureHrOrAdmin();
        List<FeedbackCampaignResponse> response = feedbackCampaignService.getAllCampaigns().stream()
                .map(this::mapCampaign)
                .toList();
        return ResponseEntity.ok(GenericApiResponse.success("Feedback campaigns retrieved successfully", response));
    }

    @GetMapping("/{campaignId}")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignResponse>> getCampaign(@PathVariable Long campaignId) {
        ensureHrOrAdmin();
        return ResponseEntity.ok(GenericApiResponse.success(
                "Feedback campaign retrieved successfully",
                mapCampaign(feedbackCampaignService.getCampaignById(campaignId))
        ));
    }

    private FeedbackCampaignResponse mapCampaign(FeedbackCampaign campaign) {
        return FeedbackCampaignResponse.builder()
                .id(campaign.getId())
                .name(campaign.getName())
                .startDate(campaign.getStartDate())
                .endDate(campaign.getEndDate())
                .status(campaign.getStatus().name())
                .createdBy(campaign.getCreatedByUserId())
                .createdAt(campaign.getCreatedAt())
                .build();
    }

    private void ensureHrOrAdmin() {
        List<String> roles = SecurityUtils.currentUser().getRoles();
        boolean authorized = roles != null && roles.stream()
                .map(String::toUpperCase)
                .anyMatch(role -> role.equals("HR") || role.equals("ADMIN") || role.equals("ROLE_HR") || role.equals("ROLE_ADMIN"));
        if (!authorized) {
            throw new UnauthorizedActionException("Only HR/Admin can manage feedback campaigns.");
        }
    }
}
