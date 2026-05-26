package com.epms.entity;

import com.epms.entity.enums.KpiTemplateCycleStatus;
import com.epms.entity.enums.KpiEarlyCloseReviewDecision;
import com.epms.entity.enums.KpiGraceExtension;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "kpi_template_cycle")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KpiTemplateCycle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "cycle_name", nullable = false, length = 255)
    private String cycleName;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "duration_months", nullable = false)
    private Integer durationMonths;

    @Column(name = "duration_years", nullable = false)
    @Builder.Default
    private Integer durationYears = 1;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private KpiTemplateCycleStatus status = KpiTemplateCycleStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", referencedColumnName = "id")
    @EqualsAndHashCode.Exclude
    private User createdByUser;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by", referencedColumnName = "id")
    @EqualsAndHashCode.Exclude
    private User updatedByUser;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "closing_requested_at")
    private LocalDateTime closingRequestedAt;

    @Column(name = "grace_ends_at")
    private LocalDateTime graceEndsAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "early_close_reason", length = 1000)
    private String earlyCloseReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "grace_extension", length = 30)
    private KpiGraceExtension graceExtension;

    @Column(name = "early_close_requested_at")
    private LocalDateTime earlyCloseRequestedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "early_close_requested_by", referencedColumnName = "id")
    @EqualsAndHashCode.Exclude
    private User earlyCloseRequestedByUser;

    @Column(name = "early_close_reviewed_at")
    private LocalDateTime earlyCloseReviewedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "early_close_reviewed_by", referencedColumnName = "id")
    @EqualsAndHashCode.Exclude
    private User earlyCloseReviewedByUser;

    @Enumerated(EnumType.STRING)
    @Column(name = "early_close_review_decision", length = 30)
    private KpiEarlyCloseReviewDecision earlyCloseReviewDecision;

    @Column(name = "early_close_review_reason", length = 1000)
    private String earlyCloseReviewReason;

    @Builder.Default
    @OneToMany(mappedBy = "cycle", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @EqualsAndHashCode.Exclude
    private List<KpiTemplateCycleForm> cycleForms = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = KpiTemplateCycleStatus.DRAFT;
        }
        if (durationYears == null) {
            durationYears = 1;
        }
        if (durationMonths == null) {
            durationMonths = durationYears * 12;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
