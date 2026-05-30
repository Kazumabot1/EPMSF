package com.epms.repository;

import com.epms.entity.ContinuousFeedback;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContinuousFeedbackRepository extends JpaRepository<ContinuousFeedback, Integer> {

    @EntityGraph(attributePaths = {
            "team",
            "team.department",
            "employee",
            "giverUser"
    })
    List<ContinuousFeedback> findByGiverUserIdOrderByCreatedAtDesc(Integer giverUserId);

    @EntityGraph(attributePaths = {
            "team",
            "team.department",
            "employee",
            "giverUser"
    })
    List<ContinuousFeedback> findByEmployeeIdOrderByCreatedAtDesc(Integer employeeId);

    @EntityGraph(attributePaths = {
            "team",
            "team.department",
            "employee",
            "giverUser"
    })
    List<ContinuousFeedback> findAllByOrderByCreatedAtDesc();
}
