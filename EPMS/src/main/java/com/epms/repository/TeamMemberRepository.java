package com.epms.repository;

import com.epms.entity.TeamMember;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.repository.query.Param;

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

    @EntityGraph(attributePaths = {
            "team",
            "team.department",
            "team.teamLeader",
            "team.projectManager",
            "memberUser",
            "memberUser.position"
    })
    @Query("""
    SELECT tm
    FROM TeamMember tm
    JOIN tm.team t
    WHERE tm.memberUser.id = :userId
      AND tm.endedDate IS NULL
      AND LOWER(t.status) = 'active'
    """)
    List<TeamMember> findActiveMembershipsByMemberUserId(@Param("userId") Integer userId);

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


    @Query("""
        SELECT CASE WHEN COUNT(tm) > 0 THEN true ELSE false END
        FROM TeamMember tm
        JOIN tm.team t
        JOIN tm.memberUser u
        WHERE u.id = :userId
          AND tm.endedDate IS NULL
          AND (u.active IS NULL OR u.active = true)
          AND LOWER(t.status) = 'active'
        """)
    boolean existsActiveMembershipByMemberUserId(@Param("userId") Integer userId);

}