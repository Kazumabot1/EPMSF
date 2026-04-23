package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "appraisal_questions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "section_id")
    private AppraisalSection section;

    private String questionText;
    private String responseType; // TEXT, RATING, YES_NO
    private Boolean isRequired = true;
    private Double weight = 1.0;

    @ManyToOne
    @JoinColumn(name = "rating_scale_id")
    private RatingScale ratingScale;

    @Temporal(TemporalType.TIMESTAMP)
    private LocalDateTime createdAt = LocalDateTime.now();
}
