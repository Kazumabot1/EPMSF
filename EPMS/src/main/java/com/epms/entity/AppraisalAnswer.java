package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "appraisal_answers")
@Data
@NoArgsConstructor
@AllArgsConstructor

public class AppraisalAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer Id;

    @ManyToOne
    @JoinColumn(name = "review_id")
    private AppraisalReview review;

    @ManyToOne
    @JoinColumn(name = "question_id")
    private AppraisalQuestion question;

    private String answerText;
    private Double ratingValue;
    private Boolean yesNoValue;

    private Double weightedScore;
}