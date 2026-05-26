package com.epms.entity;

import com.epms.entity.enums.KpiTemplateCycleStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "department_kpi_cycle")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DepartmentKpiCycle {
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

    @Column(name = "last_edit_reason", length = 1000)
    private String lastEditReason;

    @Builder.Default
    @OneToMany(mappedBy = "cycle", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @EqualsAndHashCode.Exclude
    private List<DepartmentKpiCycleTemplate> cycleTemplates = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "cycle", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @EqualsAndHashCode.Exclude
    private List<DepartmentKpiCyclePeriod> periods = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = KpiTemplateCycleStatus.DRAFT;
        if (durationYears == null) durationYears = 1;
        if (durationMonths == null) durationMonths = durationYears * 12;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
        if (durationYears == null) durationYears = durationMonths == null ? 1 : Math.max(1, (int) Math.ceil(durationMonths / 12.0));
        if (durationMonths == null) durationMonths = durationYears * 12;
    }
}
