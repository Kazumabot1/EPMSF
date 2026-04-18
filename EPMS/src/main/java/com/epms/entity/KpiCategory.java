package com.epms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "kpi_category")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class KpiCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String name;

    @OneToMany(mappedBy = "kpiCategory", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Kpi> kpis = new ArrayList<>();

    @OneToMany(mappedBy = "kpiCategory", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<KpiItem> kpiItems = new ArrayList<>();
}