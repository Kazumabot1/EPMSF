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

    @GetMapping("/hr")
    public ResponseEntity<GenericApiResponse<List<EmployeeChangeRequestDtos.SummaryResponse>>> getAllForHr() {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Employee change requests fetched",
                        employeeChangeRequestService.getAllForHr()
                )
        );
    }

    @GetMapping("/ceo/pending")
    public ResponseEntity<GenericApiResponse<List<EmployeeChangeRequestDtos.SummaryResponse>>> getPendingForCeo() {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Pending employee change requests fetched",
                        employeeChangeRequestService.getPendingForCeo()
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

    @GetMapping("/ceo/{requestId}")
    public ResponseEntity<GenericApiResponse<EmployeeChangeRequestDtos.DetailResponse>> getCeoDetail(
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
                        "Position change request submitted for CEO approval",
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
                        "Department change request submitted for CEO approval",
                        employeeChangeRequestService.createDepartmentChangeRequest(request)
                )
        );
    }

    @PostMapping("/ceo/{requestId}/approve")
    public ResponseEntity<GenericApiResponse<EmployeeChangeRequestDtos.SummaryResponse>> approveByCeo(
            @PathVariable Long requestId,
            @RequestBody EmployeeChangeRequestDtos.ReviewRequest request
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Employee change request approved and applied",
                        employeeChangeRequestService.approveByCeo(requestId, request)
                )
        );
    }

    @PostMapping("/ceo/{requestId}/reject")
    public ResponseEntity<GenericApiResponse<EmployeeChangeRequestDtos.SummaryResponse>> rejectByCeo(
            @PathVariable Long requestId,
            @RequestBody EmployeeChangeRequestDtos.ReviewRequest request
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Employee change request rejected",
                        employeeChangeRequestService.rejectByCeo(requestId, request)
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