
package com.epms.repository;

import com.epms.entity.TeamMember;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamMemberRepository extends JpaRepository<TeamMember, Integer> {

    @EntityGraph(attributePaths = {"team", "team.department", "memberUser"})
    List<TeamMember> findByTeamId(Integer teamId);

    @EntityGraph(attributePaths = {"team", "team.department", "memberUser"})
    List<TeamMember> findByMemberUserId(Integer userId);

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

    @EntityGraph(attributePaths = {"team", "team.department", "memberUser"})
    List<TeamMember> findByMemberUserIdAndEndedDateIsNull(Integer userId);

    boolean existsByMemberUserIdAndEndedDateIsNull(Integer userId);
}
