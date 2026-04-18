package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.Date;

@Entity
@Table(name = "kpi_version_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class KpiVersionHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kpi_id", nullable = false)
    private Kpi kpiForm;

    @Column(name = "column_name", nullable = false)
    private String kpiColumnName;

    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "changed_at", nullable = false)
    private Date changedAt;

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
    @Column(name = "change_type")
    private ChangeType changeType;

    // Enum for change types
    public enum ChangeType {
        CREATED,
        UPDATED,
        DELETED,
        RESTORED,
        WEIGHT_MODIFIED,
        TARGET_MODIFIED,
        CATEGORY_CHANGED
    }

    // Helper method to format the change description
    public String getChangeDescription() {
        if (changeType == ChangeType.CREATED) {
            return String.format("KPI created with %s: %s", kpiColumnName, newValue);
        } else if (changeType == ChangeType.DELETED) {
            return String.format("KPI deleted. Previous %s was: %s", kpiColumnName, oldValue);
        } else {
            return String.format("%s changed from '%s' to '%s'",
                    kpiColumnName, oldValue, newValue);
        }
    }
}