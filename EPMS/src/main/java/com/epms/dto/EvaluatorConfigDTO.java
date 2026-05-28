package com.epms.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class EvaluatorConfigDTO {

    private Boolean includeManager = true;

    /**
     * New simplified peer switch for the redesigned 360 setup. When enabled, the
     * service resolves peers from active team first, then current department fallback.
     */
    private Boolean includePeers = true;

    private Boolean includeSubordinates = true;

    private Boolean includeSelf = true;

    @Min(value = 0, message = "Minimum peer count cannot be negative.")
    private Integer peerMinCount = 2;

    @Positive(message = "Maximum peer count must be greater than zero.")
    private Integer peerMaxCount = 3;

    @Min(value = 0, message = "Minimum subordinate count cannot be negative.")
    private Integer subordinateMinCount = 0;

    @Min(value = 0, message = "Maximum subordinate count cannot be negative.")
    private Integer subordinateMaxCount = 3;

    /**
     * True means insufficient peer/subordinate counts produce warnings but do not
     * prevent preview/generation. This is the safer first production behavior for
     * small departments, junior employees, and imperfect org data.
     */
    private Boolean flexibleMode = true;

    /**
     * Legacy fields kept so older callers do not break while the new Campaign Setup
     * UI moves to role-based rules. They are mapped into includePeers internally.
     */
    private Boolean includeTeamPeers = true;

    private Boolean includeDepartmentPeers = true;

    private Boolean includeProjectPeers = false;

    private Boolean includeCrossTeamPeers = false;

    @Positive(message = "Peer count must be greater than zero.")
    private Integer peerCount;
}
