package com.epms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "rating_score")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RatingScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "score_range", length = 10, nullable = false, unique = true)
    private String scoreRange;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "description_id", nullable = false)
    private RatingScale ratingScale;

    @Column(length = 200, nullable = false)
    private String explanation;

    @OneToMany(mappedBy = "ratingScore", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<RatingHistory> ratingHistories = new ArrayList<>();
}
