package com.epms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Temporal;
import jakarta.persistence.TemporalType;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Entity
@Table(
        name = "user_notification_preferences",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_user_notification_preference_scope",
                        columnNames = {"user_id", "category", "event_key"}
                )
        },
        indexes = {
                @Index(name = "idx_user_notification_preference_user", columnList = "user_id"),
                @Index(name = "idx_user_notification_preference_category", columnList = "category")
        }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserNotificationPreference {

    /**
     * Stored value for category-level preferences. Using a non-null sentinel keeps
     * the database unique constraint reliable across MySQL versions.
     */
    public static final String CATEGORY_SCOPE_EVENT_KEY = "__CATEGORY__";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 80)
    private String category;

    @Column(name = "event_key", nullable = false, length = 120)
    private String eventKey = CATEGORY_SCOPE_EVENT_KEY;

    @Column(nullable = false)
    private Boolean inAppEnabled = true;

    /** Kept for the future email-notification setting without affecting current delivery. */
    @Column(nullable = false)
    private Boolean emailEnabled = true;

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt = new Date();

    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;

    @PrePersist
    public void prePersist() {
        normalizeScope();
        Date now = new Date();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        normalizeScope();
        updatedAt = new Date();
    }

    private void normalizeScope() {
        if (eventKey == null || eventKey.isBlank()) {
            eventKey = CATEGORY_SCOPE_EVENT_KEY;
        }
        if (category != null) {
            category = category.trim().toUpperCase();
        }
        if (inAppEnabled == null) {
            inAppEnabled = true;
        }
        if (emailEnabled == null) {
            emailEnabled = true;
        }
    }
}
