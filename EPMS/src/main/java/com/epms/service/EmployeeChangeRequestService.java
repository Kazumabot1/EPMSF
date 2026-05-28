package com.epms.service;

import com.epms.dto.EmployeeChangeRequestDtos;

import java.util.List;

public interface EmployeeChangeRequestService {

    List<EmployeeChangeRequestDtos.SummaryResponse> getAllForHr();

    List<EmployeeChangeRequestDtos.SummaryResponse> getPendingForCeo();

    EmployeeChangeRequestDtos.DetailResponse getDetail(Long requestId);

    EmployeeChangeRequestDtos.SummaryResponse createPositionChangeRequest(
            EmployeeChangeRequestDtos.PositionChangeCreateRequest request
    );

    EmployeeChangeRequestDtos.SummaryResponse createDepartmentChangeRequest(
            EmployeeChangeRequestDtos.DepartmentChangeCreateRequest request
    );

    EmployeeChangeRequestDtos.SummaryResponse approveByCeo(
            Long requestId,
            EmployeeChangeRequestDtos.ReviewRequest request
    );

    EmployeeChangeRequestDtos.SummaryResponse rejectByCeo(
            Long requestId,
            EmployeeChangeRequestDtos.ReviewRequest request
    );

    EmployeeChangeRequestDtos.EmployeeChangeProfileResponse getEmployeeChangeProfile(Integer employeeId);

}