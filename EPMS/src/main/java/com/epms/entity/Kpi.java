package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.*;

@Entity
@Table(name = "kpis")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Kpi {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String title;
    private Double target;
    private String unit;
    private Integer weight;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kpi_category_id", referencedColumnName = "id")
    private KpiCategory kpiCategory;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kpi_item_id")
    private KpiItem kpiItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", referencedColumnName = "id")
    private User createdByUser;

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    @Column(name = "created_by_string")
    private String createdBy;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "updated_at")
    private Date updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by", referencedColumnName = "id")
    private User updatedByUser;

    @Column(name = "version")
    private Integer version = 1;

    // FIXED: mappedBy must match field name in KpiPosition
    @OneToMany(mappedBy = "kpiForm", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<KpiPosition> kpiPositions = new HashSet<>();

    @OneToMany(mappedBy = "kpiForm", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("changedAt DESC")
    private List<KpiVersionHistory> versionHistory = new ArrayList<>();

    public Set<Position> getPositions() {
        Set<Position> positions = new HashSet<>();
        for (KpiPosition kp : kpiPositions) {
            positions.add(kp.getPosition());
        }
        return positions;
    }

    public Double getScoreForPosition(Integer positionId) {
        for (KpiPosition kp : kpiPositions) {
            if (kp.getPosition().getId().equals(positionId)) {
                return kp.getScore();
            }
        }
        return null;
    }

    public void addVersionHistory(KpiVersionHistory history) {
        versionHistory.add(history);
        history.setKpiForm(this);
    }

    public List<KpiVersionHistory> getLatestChanges(int limit) {
        return versionHistory.stream()
                .limit(limit)
                .collect(ArrayList::new, ArrayList::add, ArrayList::addAll);
    }

    public List<KpiVersionHistory> getChangesByColumn(String columnName) {
        return versionHistory.stream()
                .filter(h -> h.getKpiColumnName().equals(columnName))
                .collect(ArrayList::new, ArrayList::add, ArrayList::addAll);
    }
}