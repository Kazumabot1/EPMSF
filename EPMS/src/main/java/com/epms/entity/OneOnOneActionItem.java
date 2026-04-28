package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "one_on_one_action_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OneOnOneActionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // One action item belongs to exactly one meeting
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meeting_id", nullable = false)
    private OneOnOneMeeting meeting;

    // Description / notes written during the meeting
    @Column(columnDefinition = "TEXT")
    private String description;

    // Updated whenever description is edited
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}