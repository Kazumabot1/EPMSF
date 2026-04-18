package com.epms.entity;

import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.EvaluatorSelectionMethod;
import com.epms.entity.enums.EvaluatorSourceType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "feedback_evaluator_assignments", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"feedback_request_id", "evaluator_employee_id"})
})
@Getter
@Setter
@NoArgsConstructor
public class FeedbackEvaluatorAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "feedback_request_id", nullable = false)
    private FeedbackRequest feedbackRequest;

    @Column(name = "evaluator_employee_id", nullable = false)
    private Long evaluatorEmployeeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false)
    private EvaluatorSourceType sourceType;

    @Enumerated(EnumType.STRING)
    @Column(name = "selection_method", nullable = false)
    private EvaluatorSelectionMethod selectionMethod;

    @Column(name = "is_anonymous", nullable = false)
    private Boolean isAnonymous;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private AssignmentStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToOne(mappedBy = "evaluatorAssignment", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private FeedbackResponse response;

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
