package com.epms.entity;

import com.epms.entity.enums.KpiPositionStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "kpi_positions",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"kpi_form_id", "position_id"})
        }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KpiPosition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // KPI Form / Template
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kpi_form_id", nullable = false)
    private KpiForm kpiForm;

    // Position linked to this KPI Form
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "position_id", nullable = false)
    private Position position;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private KpiPositionStatus status = KpiPositionStatus.ACTIVE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by", referencedColumnName = "id")
    private User assignedByUser;

    @Column(name = "assigned_by_string")
    private String assignedBy;

    @Column(name = "assigned_at", nullable = false)
    private LocalDateTime assignedAt;

    @Column(name = "removed_at")
    private LocalDateTime removedAt;

    @PrePersist
    public void prePersist() {
        if (assignedAt == null) {
            assignedAt = LocalDateTime.now();
        }

        if (status == null) {
            status = KpiPositionStatus.ACTIVE;
        }
    }

    public boolean isActive() {
        return status == KpiPositionStatus.ACTIVE;
    }
}