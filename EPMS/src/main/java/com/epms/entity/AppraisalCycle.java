package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.Date;

@Entity
@Table(name = "appraisal_cycles")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalCycle {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private String name;
    private String type; // SEMI_ANNUAL, ANNUAL, CUSTOM
    @Temporal(TemporalType.DATE)
    private Date startDate;
    @Temporal(TemporalType.DATE)
    private Date endDate;
    private Boolean isActive = true;
    private String status; // DRAFT, ACTIVE, COMPLETED, LOCKED
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt = new Date();

    private String dynamicType; // FIXED, JOIN_DATE_BASED
    private Integer dynamicOffsetMonths; // For join-date-based cycles
}