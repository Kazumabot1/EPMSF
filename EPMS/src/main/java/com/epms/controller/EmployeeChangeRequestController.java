package com.epms.controller;

import com.epms.dto.EmployeeChangeRequestDtos;
import com.epms.dto.GenericApiResponse;
import com.epms.service.EmployeeChangeRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/employee-change-requests")
@RequiredArgsConstructor
public class EmployeeChangeRequestController {

    private final EmployeeChangeRequestService employeeChangeRequestService;

    @GetMapping("/workforce-employees")
    public ResponseEntity<GenericApiResponse<List<EmployeeChangeRequestDtos.WorkforceEmployeeResponse>>> getWorkforceEmployees() {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Workforce employees fetched",
                        employeeChangeRequestService.getWorkforceEmployees()
                )
        );
    }

    @GetMapping("/workforce-positions")
    public ResponseEntity<GenericApiResponse<List<EmployeeChangeRequestDtos.WorkforcePositionResponse>>> getWorkforcePositions() {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Workforce positions fetched",
                        employeeChangeRequestService.getWorkforcePositions()
                )
        );
    }

    @GetMapping("/workforce-departments")
    public ResponseEntity<GenericApiResponse<List<EmployeeChangeRequestDtos.WorkforceDepartmentResponse>>> getWorkforceDepartments() {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Workforce departments fetched",
                        employeeChangeRequestService.getWorkforceDepartments()
                )
        );
    }

    @GetMapping("/hr")
    public ResponseEntity<GenericApiResponse<List<EmployeeChangeRequestDtos.SummaryResponse>>> getAllForHr() {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Employee change requests fetched",
                        employeeChangeRequestService.getAllForHr()
                )
        );
    }

    @GetMapping("/hradmin/pending")
    public ResponseEntity<GenericApiResponse<List<EmployeeChangeRequestDtos.SummaryResponse>>> getPendingForHrAdmin() {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Pending employee change requests fetched",
                        employeeChangeRequestService.getPendingForHrAdmin()
                )
        );
    }

    @GetMapping("/{requestId}")
    public ResponseEntity<GenericApiResponse<EmployeeChangeRequestDtos.DetailResponse>> getDetail(
            @PathVariable Long requestId
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Employee change request detail fetched",
                        employeeChangeRequestService.getDetail(requestId)
                )
        );
    }

    @GetMapping("/hradmin/{requestId}")
    public ResponseEntity<GenericApiResponse<EmployeeChangeRequestDtos.DetailResponse>> getHrAdminDetail(
            @PathVariable Long requestId
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Employee change request detail fetched",
                        employeeChangeRequestService.getDetail(requestId)
                )
        );
    }

    @PostMapping("/position-change")
    public ResponseEntity<GenericApiResponse<EmployeeChangeRequestDtos.SummaryResponse>> createPositionChangeRequest(
            @RequestBody EmployeeChangeRequestDtos.PositionChangeCreateRequest request
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Position change request submitted for HR Admin approval",
                        employeeChangeRequestService.createPositionChangeRequest(request)
                )
        );
    }

    @PostMapping("/department-change")
    public ResponseEntity<GenericApiResponse<EmployeeChangeRequestDtos.SummaryResponse>> createDepartmentChangeRequest(
            @RequestBody EmployeeChangeRequestDtos.DepartmentChangeCreateRequest request
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Department change request submitted for HR Admin approval",
                        employeeChangeRequestService.createDepartmentChangeRequest(request)
                )
        );
    }

    @PostMapping("/hradmin/{requestId}/approve")
    public ResponseEntity<GenericApiResponse<EmployeeChangeRequestDtos.SummaryResponse>> approveByHrAdmin(
            @PathVariable Long requestId,
            @RequestBody EmployeeChangeRequestDtos.ReviewRequest request
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Employee change request approved and applied",
                        employeeChangeRequestService.approveByHrAdmin(requestId, request)
                )
        );
    }

    @PostMapping("/hradmin/{requestId}/reject")
    public ResponseEntity<GenericApiResponse<EmployeeChangeRequestDtos.SummaryResponse>> rejectByHrAdmin(
            @PathVariable Long requestId,
            @RequestBody EmployeeChangeRequestDtos.ReviewRequest request
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Employee change request rejected",
                        employeeChangeRequestService.rejectByHrAdmin(requestId, request)
                )
        );
    }

    @GetMapping("/employees/{employeeId}/profile")
    public ResponseEntity<GenericApiResponse<EmployeeChangeRequestDtos.EmployeeChangeProfileResponse>> getEmployeeChangeProfile(
            @PathVariable Integer employeeId
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Employee workforce profile fetched",
                        employeeChangeRequestService.getEmployeeChangeProfile(employeeId)
                )
        );
    }
}