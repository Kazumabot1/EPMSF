package com.epms.repository;

import com.epms.entity.EmployeeChangeRequest;
import com.epms.entity.enums.EmployeeChangeRequestStatus;
import com.epms.entity.enums.EmployeeChangeRequestType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmployeeChangeRequestRepository extends JpaRepository<EmployeeChangeRequest, Long> {

    @EntityGraph(attributePaths = {
            "employee",
            "employee.position",
            "requestedByUser",
            "reviewedByUser",
            "oldPosition",
            "newPosition",
            "oldCurrentDepartment",
            "newCurrentDepartment",
            "oldParentDepartment",
            "newParentDepartment",
            "oldWorkingDepartment",
            "newWorkingDepartment",
            "oldTeam"
    })
    List<EmployeeChangeRequest> findAllByOrderByRequestedAtDesc();

    @EntityGraph(attributePaths = {
            "employee",
            "employee.position",
            "requestedByUser",
            "reviewedByUser",
            "oldPosition",
            "newPosition",
            "oldCurrentDepartment",
            "newCurrentDepartment",
            "oldParentDepartment",
            "newParentDepartment",
            "oldWorkingDepartment",
            "newWorkingDepartment",
            "oldTeam"
    })
    List<EmployeeChangeRequest> findByStatusOrderByRequestedAtDesc(EmployeeChangeRequestStatus status);

    boolean existsByEmployeeIdAndRequestTypeAndStatus(
            Integer employeeId,
            EmployeeChangeRequestType requestType,
            EmployeeChangeRequestStatus status
    );
}