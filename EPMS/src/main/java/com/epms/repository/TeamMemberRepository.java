// KHN new file
// (Repository for TeamMember entity CRUD operations)

package com.epms.repository;

import com.epms.entity.TeamMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamMemberRepository extends JpaRepository<TeamMember, Integer> {
    // KHN added parts
    // (Find members by team ID)
    List<TeamMember> findByTeamId(Integer teamId);
    
    // KHN added parts
    // (Find teams by employee ID)
    List<TeamMember> findByEmployeeId(Integer employeeId);
}
