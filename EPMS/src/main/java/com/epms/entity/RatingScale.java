package com.epms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "rating_scales")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RatingScale {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, updatable = false)
    private Integer scales;

    @Column(length = 50, nullable = false)
    private String description;

    @Column(length = 50)
    private String performanceLevel;

    @Column(length = 50)
    private String promotionEligibility;

    @OneToMany(mappedBy = "ratingScale", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<RatingScore> ratingScores = new ArrayList<>();

    @OneToMany(mappedBy = "ratingScale", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<RatingHistory> ratingHistories = new ArrayList<>();
}
