package com.epms.repository;

import com.epms.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, Integer> {

    boolean existsByUserIdAndRoleId(Integer userId, Integer roleId);
}
