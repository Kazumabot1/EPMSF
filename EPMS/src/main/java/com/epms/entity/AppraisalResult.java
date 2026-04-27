package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.Date;

@Entity
@Table(name = "appraisal_results")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalResult {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cycle_id", nullable = false)
    private AppraisalCycle cycle;

    private Double selfScore;
    private Double managerScore;
    private Double finalScore;
    private String performanceCategory;
    private String status; // DRAFT, SUBMITTED, REVIEWED, LOCKED
    private String selfComment;
    private String managerComment;
    @Temporal(TemporalType.TIMESTAMP)
    private Date submittedAt;
    @Temporal(TemporalType.TIMESTAMP)
    private Date lockedAt;
}