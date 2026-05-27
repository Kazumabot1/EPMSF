package com.epms.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class KpiEarlyCloseReviewRequestDTO {

    @Size(max = 1000, message = "Review reason cannot exceed 1,000 characters.")
    private String reviewReason;
}
