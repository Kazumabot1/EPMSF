package com.epms.controller;

/**
 * Disabled placeholder kept only to avoid duplicate Spring MVC mappings.
 *
 * Monitoring is exposed through FeedbackCampaignController at:
 * GET /api/v1/feedback/campaigns/{campaignId}/monitoring
 *
 * The previous standalone @RestController duplicated that existing route and
 * prevented Spring Boot from starting with an Ambiguous mapping error.
 */
@Deprecated
public final class FeedbackCampaignMonitoringController {
    private FeedbackCampaignMonitoringController() {
    }
}
