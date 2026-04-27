package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.*;

@Entity
@Table(name = "positions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Position {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "position_title")
    private String positionTitle;
    
    @Column(name = "description")
    private String description;

    @ManyToOne
    @JoinColumn(name = "level_id", nullable = false)
    private PositionLevel level;

    private Boolean status = true;

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    private String createdBy;

    // One-to-Many relationship with KpiPosition
    @OneToMany(mappedBy = "position", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<KpiPosition> kpiPositions = new HashSet<>();

    @OneToMany(mappedBy = "position", fetch = FetchType.LAZY)
    private List<Employee> employees = new ArrayList<>();

    // Helper method to get all KPIs for this position
    public Set<Kpi> getKpis() {
        Set<Kpi> kpiForms = new HashSet<>();
        for (KpiPosition kp : kpiPositions) {
            kpiForms.add(kp.getKpiForm());
        }
        return kpiForms;
    }

    // Helper method to calculate total weighted score for this position
    public Double getTotalWeightedScore() {
        return kpiPositions.stream()
                .mapToDouble(kp -> kp.getWeightedScore() != null ? kp.getWeightedScore() : 0.0)
                .sum();
    }

    // Helper method to get KPI performance for this position
    public KpiPosition getKpiPerformance(Integer kpiId) {
        for (KpiPosition kp : kpiPositions) {
            if (kp.getKpiForm().getId().equals(kpiId)) {
                return kp;
            }
        }
        return null;
    }
}