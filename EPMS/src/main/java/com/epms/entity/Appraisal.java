package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Entity
@Table(name = "appraisals")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Appraisal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer Id;

    @ManyToOne
    @JoinColumn(name = "employee_id")
    private Employee employee;

    @ManyToOne
    @JoinColumn(name = "cycle_id")
    private AppraisalCycle cycle;

    @ManyToOne
    @JoinColumn(name = "form_id")
    private AppraisalForm form;

    private String appraisalStatus;
    private Double overallScore;
    private String performanceCategory;

    @OneToMany(mappedBy = "appraisal")
    private List<AppraisalReview> reviews;

    @OneToMany(mappedBy = "appraisal")
    private List<Recommendation> recommendations;
}