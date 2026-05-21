package com.epms.entity;

import com.epms.entity.enums.KpiVersionRowStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "kpi_template_version_rows")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KpiTemplateVersionRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kpi_form_id", nullable = false)
    private KpiForm kpiForm;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "row_status", nullable = false, length = 30)
    private KpiVersionRowStatus rowStatus;

    @Column(name = "row_snapshot", nullable = false, columnDefinition = "TEXT")
    private String rowSnapshot;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "changed_at")
    private LocalDateTime changedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by", referencedColumnName = "id")
    private User changedByUser;

    @Column(name = "changed_by_string")
    private String changedBy;

    @PrePersist
    public void prePersist() {
        if (changedAt == null) {
            changedAt = LocalDateTime.now();
        }
    }
}
