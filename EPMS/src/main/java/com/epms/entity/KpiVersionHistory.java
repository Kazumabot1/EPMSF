package com.epms.entity;

import com.epms.entity.enums.KpiChangeType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "kpi_version_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KpiVersionHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kpi_form_id", nullable = false)
    private KpiForm kpiForm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kpi_form_item_id")
    private KpiFormItem kpiFormItem;

    @Column(name = "column_name", nullable = false)
    private String columnName;

    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt;

    @Column(name = "changed_reason")
    private String changedReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "modified_by", referencedColumnName = "id")
    private User modifiedByUser;

    @Column(name = "modified_by_string")
    private String modifiedBy;

    @Column(name = "version_number")
    private Integer versionNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "change_type", length = 40)
    private KpiChangeType changeType;

    @PrePersist
    public void prePersist() {
        if (changedAt == null) changedAt = LocalDateTime.now();
    }
}
