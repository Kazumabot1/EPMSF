package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.Date;

@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    private String title;
    private String message;
    private String type; // APPRAISAL, FEEDBACK, etc.

    /** High-level delivery setting category resolved by NotificationPolicyRegistry. */
    @Column(length = 80)
    private String category;

    /** Exact notification event key used for user preferences and later analytics. */
    @Column(length = 120)
    private String eventKey;

    /** Locked notifications are required for workflow safety and ignore user opt-out settings. */
    private Boolean mandatory = false;

    /** Optional FK target (e.g. kpi_form.id for KPI_* notification types). */
    private Integer referenceId;

    private Boolean isRead = false;

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt = new Date();

    @ManyToOne
    @JoinColumn(name = "notification_template_id")
    private NotificationTemplate notificationTemplate;
}