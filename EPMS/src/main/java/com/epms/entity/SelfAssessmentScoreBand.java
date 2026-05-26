package com.epms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "self_assessment_score_bands")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SelfAssessmentScoreBand {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "min_score", nullable = false)
    private Integer minScore;

    @Column(name = "max_score", nullable = false)
    private Integer maxScore;

    @Column(nullable = false, length = 120)
    private String label;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();

        if (createdAt == null) {
            createdAt = now;
        }

        updatedAt = now;

        if (sortOrder == null) {
            sortOrder = 0;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();

        if (sortOrder == null) {
            sortOrder = 0;
        }
    }
}