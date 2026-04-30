package com.epms.entity;

import com.epms.entity.enums.KpiFormStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "kpi_form")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KpiForm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private KpiFormStatus status = KpiFormStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", referencedColumnName = "id")
    private User createdByUser;

    @Column(name = "created_by_string")
    private String createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by", referencedColumnName = "id")
    private User updatedByUser;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "finalized_at")
    private LocalDateTime finalizedAt;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(nullable = false)
    private Integer version = 1;

    @Builder.Default
    @OneToMany(mappedBy = "kpiForm", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("sortOrder ASC")
    private List<KpiFormItem> items = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "kpiForm", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<EmployeeKpiForm> employeeKpiForms = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "kpiForm", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("changedAt DESC")
    private List<KpiVersionHistory> versionHistory = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "kpiForm", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<KpiPosition> kpiPositions = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = KpiFormStatus.DRAFT;
        if (version == null) version = 1;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Integer getTotalWeight() {
        return items.stream()
                .mapToInt(item -> item.getWeight() == null ? 0 : item.getWeight())
                .sum();
    }

    public boolean isValidWeightTotal() {
        return getTotalWeight() == 100;
    }

    public void addItem(KpiFormItem item) {
        items.add(item);
        item.setKpiForm(this);
    }

    public void removeItem(KpiFormItem item) {
        items.remove(item);
        item.setKpiForm(null);
    }
}