package com.epms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Entity
@Table(name = "team")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Team {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "team_name", nullable = false, length = 100)
    private String teamName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_leader_id", nullable = false)
    private User teamLeader;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdByUser;

    @Temporal(TemporalType.DATE)
    @Column(name = "created_date", nullable = false)
    private Date createdDate = new Date();

    @Column(name = "team_goal", length = 500)
    private String teamGoal;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "Active";

    @OneToMany(mappedBy = "team", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<TeamMember> teamMembers = new ArrayList<>();

    public void addTeamMember(TeamMember member) {
        if (member == null) return;

        if (!teamMembers.contains(member)) {
            teamMembers.add(member);
        }

        member.setTeam(this);

        if (member.getStartedDate() == null) {
            member.setStartedDate(new Date());
        }
    }

    public void removeTeamMember(TeamMember member) {
        if (member == null) return;

        teamMembers.remove(member);
        member.setTeam(null);
    }

    public void clearTeamMembers() {
        for (TeamMember member : new ArrayList<>(teamMembers)) {
            removeTeamMember(member);
        }
    }

    public boolean isActiveTeam() {
        return status != null && status.equalsIgnoreCase("Active");
    }

    public boolean isLeader(Integer userId) {
        return userId != null
                && teamLeader != null
                && userId.equals(teamLeader.getId());
    }

    public boolean hasMember(Integer userId) {
        if (userId == null || teamMembers == null) return false;

        return teamMembers.stream()
                .anyMatch(member ->
                        member.getMemberUser() != null
                                && userId.equals(member.getMemberUser().getId())
                );
    }
}