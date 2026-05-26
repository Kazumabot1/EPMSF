package com.epms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "feedback_competencies", uniqueConstraints = {
        @UniqueConstraint(name = "uk_feedback_competency_code", columnNames = "code")
})
@Getter
@Setter
@NoArgsConstructor
public class FeedbackCompetency {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, length = 80)
    private String code;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "category", nullable = false, length = 80)
    private String category = "PERFORMANCE_360";

    @Column(name = "default_weight_percent", nullable = false)
    private Double defaultWeightPercent = 0.0;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 100;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.category == null || this.category.isBlank()) {
            this.category = "PERFORMANCE_360";
        }
        if (this.defaultWeightPercent == null || this.defaultWeightPercent < 0) {
            this.defaultWeightPercent = 0.0;
        }
        if (this.displayOrder == null) {
            this.displayOrder = 100;
        }
        if (this.status == null || this.status.isBlank()) {
            this.status = "ACTIVE";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
