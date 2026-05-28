package com.epms.entity;

import com.epms.entity.enums.EmployeeChangeRequestStatus;
import com.epms.entity.enums.EmployeeChangeRequestType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "employee_change_requests")
@Getter
@Setter
public class EmployeeChangeRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_type", nullable = false, length = 40)
    private EmployeeChangeRequestType requestType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private EmployeeChangeRequestStatus status = EmployeeChangeRequestStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requested_by_user_id", nullable = false)
    private User requestedByUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_user_id")
    private User reviewedByUser;

    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt = LocalDateTime.now();

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "request_reason", nullable = false, columnDefinition = "TEXT")
    private String requestReason;

    @Column(name = "ceo_review_reason", columnDefinition = "TEXT")
    private String ceoReviewReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "old_position_id")
    private Position oldPosition;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "new_position_id")
    private Position newPosition;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "old_current_department_id")
    private Department oldCurrentDepartment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "new_current_department_id")
    private Department newCurrentDepartment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "old_parent_department_id")
    private Department oldParentDepartment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "new_parent_department_id")
    private Department newParentDepartment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "old_working_department_id")
    private Department oldWorkingDepartment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "new_working_department_id")
    private Department newWorkingDepartment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "old_team_id")
    private Team oldTeam;

    @Column(name = "old_team_name")
    private String oldTeamName;

    @Column(name = "validation_summary", columnDefinition = "TEXT")
    private String validationSummary;

    @Column(name = "blocking_summary", columnDefinition = "TEXT")
    private String blockingSummary;

    @PrePersist
    void onCreate() {
        if (status == null) {
            status = EmployeeChangeRequestStatus.PENDING;
        }

        if (requestedAt == null) {
            requestedAt = LocalDateTime.now();
        }
    }
}