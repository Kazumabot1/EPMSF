package com.epms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "self_assessment_score_band_audits")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SelfAssessmentScoreBandAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "band_id")
    private Integer bandId;

    @Column(name = "sort_order")
    private Integer sortOrder;

    @Column(name = "changed_by_user_id")
    private Integer changedByUserId;

    @Column(name = "changed_by_name", length = 180)
    private String changedByName;

    @Column(name = "changed_by_role", length = 180)
    private String changedByRole;

    @Column(name = "changed_part", nullable = false, length = 80)
    private String changedPart;

    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    @Column(name = "reason", nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt;

    @PrePersist
    public void prePersist() {
        if (changedAt == null) {
            changedAt = LocalDateTime.now();
        }
    }
}