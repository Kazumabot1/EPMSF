package com.epms.controller;

import com.epms.dto.FeedbackRequestListResponse;
import com.epms.dto.GenericApiResponse;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.User;
import com.epms.exception.UnauthorizedActionException;
import com.epms.repository.UserRepository;
import com.epms.security.SecurityUtils;
import com.epms.service.FeedbackRequestService;
import com.epms.service.FeedbackWorkRelationshipResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/api/v1/feedback/requests")
@RequiredArgsConstructor
public class FeedbackRequestController {

    private final FeedbackRequestService feedbackRequestService;
    private final UserRepository userRepository;
    private final FeedbackWorkRelationshipResolver workRelationshipResolver;

    @GetMapping("/{employeeId}")
    public ResponseEntity<GenericApiResponse<Page<FeedbackRequestListResponse>>> getRequestsForEmployee(
            @PathVariable Long employeeId,
            Pageable pageable
    ) {
        ensureCanViewEmployeeRequests(employeeId);
        List<FeedbackRequest> requests = feedbackRequestService.getRequestsForEmployee(employeeId);
        List<FeedbackRequestListResponse> dtoList = requests.stream()
                .map(req -> FeedbackRequestListResponse.builder()
                        .id(req.getId())
                        .campaignId(req.getCampaign().getId())
                        .campaignName(req.getCampaign().getName())
                        .targetEmployeeId(req.getTargetEmployeeId())
                        .totalAssignments(req.getAssignments() != null ? req.getAssignments().size() : 0)
                        .submittedAssignments(
                                req.getAssignments() == null
                                        ? 0
                                        : req.getAssignments().stream().filter(a -> "SUBMITTED".equals(a.getStatus().name())).count()
                        )
                        .build())
                .toList();

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), dtoList.size());
        List<FeedbackRequestListResponse> content = start >= dtoList.size()
                ? List.of()
                : dtoList.subList(start, end);

        return ResponseEntity.ok(GenericApiResponse.success(
                "Feedback requests fetched successfully",
                new PageImpl<>(content, pageable, dtoList.size())
        ));
    }

    private void ensureCanViewEmployeeRequests(Long employeeId) {
        if (hasRole("HR") || hasRole("HRADMIN")) {
            return;
        }

        Integer currentUserId = SecurityUtils.currentUserId();
        Long currentEmployeeId = userRepository.findById(currentUserId)
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
                .orElse(null);

        if (Objects.equals(currentEmployeeId, employeeId)) {
            return;
        }

        User currentUser = userRepository.findById(currentUserId).orElse(null);
        boolean managesTarget = userRepository.findByEmployeeId(employeeId.intValue())
                .map(targetUser -> workRelationshipResolver.isWorkContextManager(targetUser, currentUser))
                .orElse(false);

        if (!managesTarget) {
            throw new UnauthorizedActionException("You are not authorized to view feedback requests for this employee.");
        }
    }

    private boolean hasRole(String roleName) {
        List<String> roles = SecurityUtils.currentUser().getRoles();
        if (roles == null) {
            return false;
        }
        String normalized = roleName.toUpperCase();
        return roles.stream()
                .map(String::toUpperCase)
                .anyMatch(role -> role.equals(normalized) || role.equals("ROLE_" + normalized));
    }

}
