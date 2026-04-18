package com.epms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "position_levels")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PositionLevel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // Example: LD1, LD2
    @Column(name = "level_code", nullable = false, unique = true)
    private String levelCode;

    // Optional reverse mapping
    @OneToMany(mappedBy = "level", fetch = FetchType.LAZY)
    private Set<Position> positions = new HashSet<>();
}