package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "one_on_one_meetings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OneOnOneMeeting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // The employee who is being met with
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    // The HR/Manager who created the meeting (manager_id)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id", nullable = false)
    private Employee manager;

    // Full datetime: e.g. 2026-05-01T10:30:00
    @Column(name = "scheduled_date")
    private LocalDateTime scheduledDate;

    private String notes;

    // 0 = not started, 1 = started/ongoing. Auto-flips when scheduledDate is reached.
    @Column(columnDefinition = "BIT(1) DEFAULT 0")
    private Boolean status = false;

    // Full datetime of follow-up meeting (null = no follow-up)
    @Column(name = "follow_up_date")
    private LocalDateTime followUpDate;

    // Set when meeting is fully finalized (null = not yet finalized). Auto-stamped by server.
    @Column(name = "is_finalized")
    private LocalDateTime isFinalized;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // modified by KHN ( ChatGPT)
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Self-referencing FK: set when this meeting is a follow-up of another meeting
    @Column(name = "parent_meeting_id")
    private Integer parentMeetingId;

    // One meeting has at most one action item
    @OneToOne(mappedBy = "meeting", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private OneOnOneActionItem actionItem;

    @Column(name = "follow_up_notes", length = 1000)
    private String followUpNotes;

    @Column(name = "reminder_24h_sent")
    private Boolean reminder24hSent = false;

}