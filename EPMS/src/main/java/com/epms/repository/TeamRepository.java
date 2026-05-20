

package com.epms.repository;

import com.epms.entity.Team;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamRepository extends JpaRepository<Team, Integer> {
    long count();

    @Override
    @EntityGraph(attributePaths = {
            "teamLeader",
            "teamLeader.position",
            "projectManager",
            "projectManager.position",
            "createdByUser",
            "createdByUser.position",
            "department",
            "teamMembers",
            "teamMembers.memberUser",
            "teamMembers.memberUser.position"
    })
    List<Team> findAll();

    @EntityGraph(attributePaths = {
            "teamLeader",
            "teamLeader.position",
            "projectManager",
            "projectManager.position",
            "createdByUser",
            "createdByUser.position",
            "department",
            "teamMembers",
            "teamMembers.memberUser",
            "teamMembers.memberUser.position"
    })
    List<Team> findByTeamLeaderId(Integer teamLeaderId);

    @EntityGraph(attributePaths = {
            "teamLeader",
            "teamLeader.position",
            "projectManager",
            "projectManager.position",
            "createdByUser",
            "createdByUser.position",
            "department",
            "teamMembers",
            "teamMembers.memberUser",
            "teamMembers.memberUser.position"
    })
    List<Team> findByTeamLeaderIdAndStatusIgnoreCase(Integer teamLeaderId, String status);

    @EntityGraph(attributePaths = {
            "teamLeader",
            "teamLeader.position",
            "projectManager",
            "projectManager.position",
            "createdByUser",
            "createdByUser.position",
            "department",
            "teamMembers",
            "teamMembers.memberUser",
            "teamMembers.memberUser.position"
    })
    List<Team> findByProjectManagerId(Integer projectManagerId);

    @EntityGraph(attributePaths = {
            "teamLeader",
            "teamLeader.position",
            "projectManager",
            "projectManager.position",
            "createdByUser",
            "createdByUser.position",
            "department",
            "teamMembers",
            "teamMembers.memberUser",
            "teamMembers.memberUser.position"
    })
    List<Team> findByProjectManagerIdAndStatusIgnoreCase(Integer projectManagerId, String status);

    @EntityGraph(attributePaths = {
            "teamLeader",
            "teamLeader.position",
            "projectManager",
            "projectManager.position",
            "createdByUser",
            "createdByUser.position",
            "department",
            "teamMembers",
            "teamMembers.memberUser",
            "teamMembers.memberUser.position"
    })
    List<Team> findByDepartmentId(Integer departmentId);

    @EntityGraph(attributePaths = {
            "teamLeader",
            "teamLeader.position",
            "projectManager",
            "projectManager.position",
            "createdByUser",
            "createdByUser.position",
            "department",
            "teamMembers",
            "teamMembers.memberUser",
            "teamMembers.memberUser.position"
    })
    List<Team> findByDepartmentIdAndStatusIgnoreCase(Integer departmentId, String status);
    boolean existsByTeamLeaderIdAndStatusIgnoreCase(Integer teamLeaderId, String status);

}