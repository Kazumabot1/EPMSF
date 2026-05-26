package com.epms.entity.enums;

import java.time.LocalDateTime;

public enum KpiGraceExtension {
    ONE_WEEK,
    TWO_WEEKS,
    THREE_WEEKS,
    ONE_MONTH;

    public LocalDateTime addTo(LocalDateTime value) {
        return switch (this) {
            case ONE_WEEK -> value.plusWeeks(1);
            case TWO_WEEKS -> value.plusWeeks(2);
            case THREE_WEEKS -> value.plusWeeks(3);
            case ONE_MONTH -> value.plusMonths(1);
        };
    }
}
