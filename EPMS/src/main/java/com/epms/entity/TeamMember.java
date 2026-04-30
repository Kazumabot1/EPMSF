package com.epms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Entity
@Table(
        name = "team_member",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_team_member_team_user",
                        columnNames = {"team_id", "member_user_id"}
                )
        }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeamMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_user_id", nullable = false)
    private User memberUser;

    @Temporal(TemporalType.DATE)
    @Column(name = "started_date", nullable = false)
    private Date startedDate = new Date();

    @Temporal(TemporalType.DATE)
    @Column(name = "ended_date")
    private Date endedDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "edited_by_id")
    private User editedByUser;
}