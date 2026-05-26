package com.epms.repository;

import com.epms.entity.TeamMember;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamMemberRepository extends JpaRepository<TeamMember, Integer> {

    @EntityGraph(attributePaths = {
            "team",
            "team.department",
            "team.teamLeader",
            "team.teamLeader.position",
            "team.projectManager",
            "team.projectManager.position",
            "memberUser",
            "memberUser.position"
    })
    List<TeamMember> findByTeamId(Integer teamId);

    @EntityGraph(attributePaths = {
            "team",
            "team.department",
            "team.teamLeader",
            "team.teamLeader.position",
            "team.projectManager",
            "team.projectManager.position",
            "memberUser",
            "memberUser.position"
    })
    List<TeamMember> findByMemberUserId(Integer userId);

    @EntityGraph(attributePaths = {
            "team",
            "team.department",
            "team.teamLeader",
            "team.teamLeader.position",
            "team.projectManager",
            "team.projectManager.position",
            "memberUser",
            "memberUser.position"
    })
    List<TeamMember> findByMemberUserIdAndEndedDateIsNull(Integer userId);

    @EntityGraph(attributePaths = {"team", "team.department", "memberUser", "memberUser.position"})
    @Query("""
        SELECT tm
        FROM TeamMember tm
        JOIN tm.team t
        JOIN tm.memberUser u
        WHERE tm.endedDate IS NULL
          AND (u.active IS NULL OR u.active = true)
          AND LOWER(t.status) = 'active'
        """)
    List<TeamMember> findActiveMemberships();

    boolean existsByMemberUserIdAndEndedDateIsNull(Integer userId);
}