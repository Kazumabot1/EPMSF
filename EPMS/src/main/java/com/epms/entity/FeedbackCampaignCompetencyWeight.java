package com.epms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "feedback_campaign_competency_weights", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"campaign_id", "competency_id"})
})
@Getter
@Setter
@NoArgsConstructor
public class FeedbackCampaignCompetencyWeight {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    private FeedbackCampaign campaign;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "competency_id", nullable = false)
    private FeedbackCompetency competency;

    @Column(name = "competency_code_snapshot", nullable = false, length = 120)
    private String competencyCodeSnapshot;

    @Column(name = "competency_name_snapshot", nullable = false, length = 255)
    private String competencyNameSnapshot;

    @Column(name = "weight_percent", nullable = false, precision = 7, scale = 2)
    private BigDecimal weightPercent = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
