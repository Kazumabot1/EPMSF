package com.epms.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Temporal;
import jakarta.persistence.TemporalType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Entity
@Table(name = "assessment_forms")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssessmentFormDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "form_name", nullable = false, length = 180)
    private String formName;

    @Column(name = "company_name", length = 180)
    private String companyName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "is_active", nullable = false)
    private Boolean active = true;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "assessment_form_target_roles",
            joinColumns = @JoinColumn(name = "form_id")
    )
    @Column(name = "target_role", nullable = false, length = 60)
    private List<String> targetRoles = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "assessment_form_target_departments",
            joinColumns = @JoinColumn(name = "form_id")
    )
    @Column(name = "department_id", nullable = false)
    private List<Integer> targetDepartmentIds = new ArrayList<>();

    @OneToMany(
            mappedBy = "form",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.LAZY
    )
    @OrderBy("orderNo ASC")
    private List<AssessmentFormSectionDefinition> sections = new ArrayList<>();

    @OneToMany(
            mappedBy = "form",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.LAZY
    )
    @OrderBy("sortOrder ASC")
    private List<AssessmentFormScoreBandDefinition> scoreBands = new ArrayList<>();

    @Temporal(TemporalType.TIMESTAMP)
    @Column(nullable = false, updatable = false)
    private Date createdAt;

    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;

    @PrePersist
    public void prePersist() {
        Date now = new Date();

        if (active == null) {
            active = true;
        }

        if (targetRoles == null) {
            targetRoles = new ArrayList<>();
        }

        if (targetDepartmentIds == null) {
            targetDepartmentIds = new ArrayList<>();
        }

        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        if (targetRoles == null) {
            targetRoles = new ArrayList<>();
        }

        if (targetDepartmentIds == null) {
            targetDepartmentIds = new ArrayList<>();
        }

        updatedAt = new Date();
    }
}