package com.epms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "notification_templates")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private String channelType;
    private String subjectTemplate;
    private String bodyTemplate;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "notification_template_channels",
            joinColumns = @JoinColumn(name = "notification_template_id")
    )
    @Column(name = "channel", nullable = false)
    private Set<String> channels = new LinkedHashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "notification_template_target_roles",
            joinColumns = @JoinColumn(name = "notification_template_id")
    )
    @Column(name = "target_role", nullable = false)
    private Set<String> targetRoles = new LinkedHashSet<>();

    @OneToMany(mappedBy = "notificationTemplate")
    private java.util.List<Notification> notifications;
}
