package com.epms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "employee_assessment_answers")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeAssessmentAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id", nullable = false)
    private EmployeeAssessment assessment;

    @Column(name = "section_title", nullable = false)
    private String sectionTitle;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Column(name = "item_order", nullable = false)
    private Integer itemOrder;

    @Column(name = "rating")
    private Integer rating;

    @Column(name = "max_rating", nullable = false)
    private Integer maxRating;

    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;
}