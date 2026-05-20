
package com.epms.repository;

import com.epms.entity.TeamMember;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamMemberRepository extends JpaRepository<TeamMember, Integer> {

    @EntityGraph(attributePaths = {"team", "team.department", "memberUser"})
    List<TeamMember> findByTeamId(Integer teamId);

    @EntityGraph(attributePaths = {"team", "team.department", "memberUser"})
    List<TeamMember> findByMemberUserId(Integer userId);

    @EntityGraph(attributePaths = {"team", "team.department", "memberUser"})
    List<TeamMember> findByMemberUserIdAndEndedDateIsNull(Integer userId);

    boolean existsByMemberUserIdAndEndedDateIsNull(Integer userId);
}
