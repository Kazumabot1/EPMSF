package com.epms.entity;

import com.epms.entity.enums.FeedbackFormStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "feedback_forms")
@Getter
@Setter
@NoArgsConstructor
public class FeedbackForm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "form_name", nullable = false)
    private String formName;

    @Column(name = "anonymous_allowed", nullable = false)
    private Boolean anonymousAllowed;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private FeedbackFormStatus status;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "form", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<FeedbackSection> sections = new ArrayList<>();

    @OneToMany(mappedBy = "form", fetch = FetchType.LAZY)
    private List<FeedbackRequest> feedbackRequests = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
