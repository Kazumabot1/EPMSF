package com.epms.entity;

import com.epms.entity.enums.KpiTemplateCyclePeriodStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "kpi_template_cycle_period",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_kpi_cycle_period_number",
                columnNames = {"cycle_id", "kpi_form_id", "period_number"}
        )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KpiTemplateCyclePeriod {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cycle_id", nullable = false)
    @EqualsAndHashCode.Exclude
    private KpiTemplateCycle cycle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kpi_form_id")
    @EqualsAndHashCode.Exclude
    private KpiForm kpiForm;

    @Column(name = "period_number", nullable = false)
    private Integer periodNumber;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private KpiTemplateCyclePeriodStatus status;

    @Column(name = "closing_requested_at")
    private LocalDateTime closingRequestedAt;

    @Column(name = "grace_ends_at")
    private LocalDateTime graceEndsAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @PrePersist
    public void prePersist() {
        if (status == null) {
            status = KpiTemplateCyclePeriodStatus.OPEN;
        }
    }
}
