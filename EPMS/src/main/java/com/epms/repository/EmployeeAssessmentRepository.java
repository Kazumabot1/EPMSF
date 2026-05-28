package com.epms.repository;

import com.epms.entity.EmployeeAssessment;
import com.epms.entity.enums.AssessmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EmployeeAssessmentRepository extends JpaRepository<EmployeeAssessment, Long> {

    Optional<EmployeeAssessment> findFirstByUserIdAndStatusOrderByUpdatedAtDesc(
            Integer userId,
            AssessmentStatus status
    );

    Optional<EmployeeAssessment> findFirstByUserIdAndAssessmentFormIdAndStatusOrderByUpdatedAtDesc(
            Integer userId,
            Integer assessmentFormId,
            AssessmentStatus status
    );

    Optional<EmployeeAssessment> findFirstByUserIdAndAssessmentFormIdAndStatusInOrderByUpdatedAtDesc(
            Integer userId,
            Integer assessmentFormId,
            Collection<AssessmentStatus> statuses
    );

    List<EmployeeAssessment> findByUserIdAndStatusInOrderBySubmittedAtDesc(
            Integer userId,
            Collection<AssessmentStatus> statuses
    );

    List<EmployeeAssessment> findByStatusInOrderBySubmittedAtDesc(Collection<AssessmentStatus> statuses);

    List<EmployeeAssessment> findByStatusInAndManagerUserIdOrderBySubmittedAtDesc(
            Collection<AssessmentStatus> statuses,
            Integer managerUserId
    );

    List<EmployeeAssessment> findByStatusInAndDepartmentIdOrderBySubmittedAtDesc(
            Collection<AssessmentStatus> statuses,
            Integer departmentId
    );

    List<EmployeeAssessment> findByUserIdAndStatusOrderBySubmittedAtDesc(
            Integer userId,
            AssessmentStatus status
    );

    List<EmployeeAssessment> findByStatusOrderBySubmittedAtDesc(AssessmentStatus status);

    List<EmployeeAssessment> findByUserIdOrderByUpdatedAtDesc(Integer userId);
}