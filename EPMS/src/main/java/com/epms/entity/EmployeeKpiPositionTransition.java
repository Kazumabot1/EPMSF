package com.epms.entity;

import com.epms.entity.enums.KpiPositionTransitionStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "employee_kpi_position_transitions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeKpiPositionTransition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    @EqualsAndHashCode.Exclude
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "old_position_id")
    @EqualsAndHashCode.Exclude
    private Position oldPosition;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "new_position_id")
    @EqualsAndHashCode.Exclude
    private Position newPosition;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "old_employee_kpi_form_id")
    @EqualsAndHashCode.Exclude
    private EmployeeKpiForm oldEmployeeKpiForm;

    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt;

    @Column(name = "grace_ends_at", nullable = false)
    private LocalDateTime graceEndsAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private KpiPositionTransitionStatus status;

    @PrePersist
    public void prePersist() {
        if (requestedAt == null) {
            requestedAt = LocalDateTime.now();
        }
        if (status == null) {
            status = KpiPositionTransitionStatus.PENDING;
        }
    }
}
