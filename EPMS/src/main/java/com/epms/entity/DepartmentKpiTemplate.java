package com.epms.entity;

import com.epms.entity.enums.KpiFormStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "department_kpi_template")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DepartmentKpiTemplate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private KpiFormStatus status = KpiFormStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", referencedColumnName = "id")
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    private User createdByUser;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by", referencedColumnName = "id")
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    private User updatedByUser;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder.Default
    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("sortOrder ASC")
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    private List<DepartmentKpiTemplateRow> rows = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    private Set<DepartmentKpiTemplateDepartment> departments = new LinkedHashSet<>();

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = KpiFormStatus.DRAFT;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void addRow(DepartmentKpiTemplateRow row) {
        rows.add(row);
        row.setTemplate(this);
    }

    public void addDepartment(DepartmentKpiTemplateDepartment department) {
        departments.add(department);
        department.setTemplate(this);
    }
}
