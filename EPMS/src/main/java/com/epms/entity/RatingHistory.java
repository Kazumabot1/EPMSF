package com.epms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Entity
@Table(name = "rating_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RatingHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rating_scale_id")
    private RatingScale ratingScale;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rating_score_id")
    private RatingScore ratingScore;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "edited_by_id")
    private User editedByUser;

    @Column(name = "edited_by", length = 100, nullable = false)
    private String editedBy;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "edited_at", nullable = false)
    private Date editedAt = new Date();

    @Column(name = "column_name", length = 50, nullable = false)
    private String columnName;

    @Column(name = "old_text", length = 500)
    private String oldText;

    @Column(name = "new_text", length = 500)
    private String newText;
}
