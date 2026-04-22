// KHN new file
// (Repository for Team entity CRUD operations)

package com.epms.repository;

import com.epms.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamRepository extends JpaRepository<Team, Integer> {
    // KHN added parts
    // (Find teams by department)
    List<Team> findByDepartmentId(Integer departmentId);
    
    // KHN added parts
    // (Find teams by leader)
    List<Team> findByTeamLeaderId(Integer leaderId);

    // KHN added parts
    // (Find active team by leader for exclusivity check)
    List<Team> findByTeamLeaderIdAndStatusIgnoreCase(Integer leaderId, String status);
}
