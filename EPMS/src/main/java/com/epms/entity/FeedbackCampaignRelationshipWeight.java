package com.epms.entity;

import com.epms.entity.enums.FeedbackRelationshipType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "feedback_campaign_relationship_weights", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"campaign_id", "relationship_type"})
})
@Getter
@Setter
@NoArgsConstructor
public class FeedbackCampaignRelationshipWeight {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    private FeedbackCampaign campaign;

    @Enumerated(EnumType.STRING)
    @Column(name = "relationship_type", nullable = false, length = 40)
    private FeedbackRelationshipType relationshipType;

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
