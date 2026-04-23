package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

@Entity
@Table(name = "appraisal_reviews")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer Id;

    @ManyToOne
    @JoinColumn(name = "appraisal_id")
    private Appraisal appraisal;

    @ManyToOne
    @JoinColumn(name = "reviewer_employee_id")
    private Employee reviewer;

    private String reviewType;     // self, manager, peer
    private String reviewStatus;   // pending, submitted

    private Double totalScore;

    private String comments; // Added for manager review comments

    @OneToMany(mappedBy = "review")
    private List<AppraisalAnswer> answers;
}