package com.epms.repository;

import com.epms.entity.EmployeeAssessment;
import com.epms.entity.enums.AssessmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmployeeAssessmentRepository extends JpaRepository<EmployeeAssessment, Long> {

    Optional<EmployeeAssessment> findFirstByUserIdAndStatusOrderByUpdatedAtDesc(Integer userId, AssessmentStatus status);

    List<EmployeeAssessment> findByUserIdAndStatusOrderBySubmittedAtDesc(Integer userId, AssessmentStatus status);

    List<EmployeeAssessment> findByStatusOrderBySubmittedAtDesc(AssessmentStatus status);
}
