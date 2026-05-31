package com.epms.service;

import com.epms.dto.EmployeeChangeRequestDtos;

import java.util.List;

public interface EmployeeChangeRequestService {

    List<EmployeeChangeRequestDtos.SummaryResponse> getAllForHr();

    List<EmployeeChangeRequestDtos.SummaryResponse> getPendingForHrAdmin();

    EmployeeChangeRequestDtos.DetailResponse getDetail(Long requestId);

    EmployeeChangeRequestDtos.SummaryResponse createPositionChangeRequest(
            EmployeeChangeRequestDtos.PositionChangeCreateRequest request
    );

    EmployeeChangeRequestDtos.SummaryResponse createDepartmentChangeRequest(
            EmployeeChangeRequestDtos.DepartmentChangeCreateRequest request
    );

    EmployeeChangeRequestDtos.SummaryResponse approveByHrAdmin(
            Long requestId,
            EmployeeChangeRequestDtos.ReviewRequest request
    );

    EmployeeChangeRequestDtos.SummaryResponse rejectByHrAdmin(
            Long requestId,
            EmployeeChangeRequestDtos.ReviewRequest request
    );

    EmployeeChangeRequestDtos.EmployeeChangeProfileResponse getEmployeeChangeProfile(Integer employeeId);

    /*
     * Legacy method names kept only so old internal references do not break.
     * UI and API now use HR Admin approval.
     */
    default List<EmployeeChangeRequestDtos.SummaryResponse> getPendingForCeo() {
        return getPendingForHrAdmin();
    }

    default EmployeeChangeRequestDtos.SummaryResponse approveByCeo(
            Long requestId,
            EmployeeChangeRequestDtos.ReviewRequest request
    ) {
        return approveByHrAdmin(requestId, request);
    }

    default EmployeeChangeRequestDtos.SummaryResponse rejectByCeo(
            Long requestId,
            EmployeeChangeRequestDtos.ReviewRequest request
    ) {
        return rejectByHrAdmin(requestId, request);
    }
}