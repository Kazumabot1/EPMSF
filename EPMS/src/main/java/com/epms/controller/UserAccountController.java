package com.epms.controller;

import com.epms.dto.AccountProvisionResult;
import com.epms.dto.GenericApiResponse;
import com.epms.dto.HrEmployeeAccountCreateRequest;
import com.epms.entity.Department;
import com.epms.entity.Role;
import com.epms.entity.User;
import com.epms.entity.UserProfile;
import com.epms.entity.UserRole;
import com.epms.exception.BadRequestException;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.RoleRepository;
import com.epms.repository.UserProfileRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.UserRoleRepository;
import com.epms.service.HrEmployeeAccountService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserAccountController {

    private final HrEmployeeAccountService hrEmployeeAccountService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final DepartmentRepository departmentRepository;
    private final UserProfileRepository userProfileRepository;

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<AdminUserAccountResponse>>> getUsers() {
        List<AdminUserAccountResponse> users = userRepository.findAll()
                .stream()
                .sorted(Comparator.comparing(
                        User::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(GenericApiResponse.success("Users fetched", users));
    }

    @PostMapping
    public ResponseEntity<GenericApiResponse<AdminUserAccountResponse>> createUser(
            @RequestBody HrEmployeeAccountCreateRequest request
    ) {
        String email = cleanEmail(request.getEmail());

        if (email == null) {
            throw new BadRequestException("Email is required");
        }

        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new BadRequestException("Email is already used by another user");
        }

        request.setEmail(email);
        request.setRoleName(normalizeRoleName(request.getRoleName()));

        AccountProvisionResult result = hrEmployeeAccountService.createOrUpdateEmployeeAccount(request);

        if (result.getUserId() == null) {
            AdminUserAccountResponse response = new AdminUserAccountResponse();
            response.setUserId(result.getUserId());
            response.setTemporaryPasswordEmailSent(result.isTemporaryPasswordEmailSent());
            response.setMessage(result.getMessage());
            response.setSmtpErrorDetail(result.getSmtpErrorDetail());

            return ResponseEntity.ok(
                    GenericApiResponse.success("Account processing failed", response)
            );
        }

        User user = userRepository.findById(result.getUserId())
                .orElseThrow(() -> new BadRequestException("User was created but could not be loaded"));

        AdminUserAccountResponse response = toResponse(user);
        response.setTemporaryPasswordEmailSent(result.isTemporaryPasswordEmailSent());
        response.setMessage(result.getMessage());
        response.setSmtpErrorDetail(result.getSmtpErrorDetail());

        return ResponseEntity.ok(
                GenericApiResponse.success("Account processed", response)
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<GenericApiResponse<AdminUserAccountResponse>> updateUser(
            @PathVariable Integer id,
            @RequestBody AdminUserAccountUpdateRequest request
    ) {
        User user = hrEmployeeAccountService.updateAdminUserAccount(
                id,
                request.getFullName(),
                request.getEmail(),
                request.getEmployeeCode(),
                request.getDepartmentId(),
                request.getPositionId(),
                request.getRoleName(),
                request.getActive()
        );

        return ResponseEntity.ok(
                GenericApiResponse.success("User account updated", toResponse(user))
        );
    }

    @PostMapping("/{id}/resend-temporary-password")
    public ResponseEntity<GenericApiResponse<AccountProvisionResult>> resendTemporaryPassword(
            @PathVariable Integer id
    ) {
        AccountProvisionResult result = hrEmployeeAccountService.resendTemporaryPassword(id);

        String summary = result.isSuccess()
                ? "Onboarding email was accepted for delivery"
                : "Onboarding email could not be sent";

        return ResponseEntity.ok(GenericApiResponse.success(summary, result));
    }

    @PostMapping("/resync-employee-links")
    public ResponseEntity<GenericApiResponse<Integer>> resyncEmployeeLinks() {
        int synced = hrEmployeeAccountService.resyncAllUserEmployeeLinks();

        return ResponseEntity.ok(
                GenericApiResponse.success("User and employee records resynced", synced)
        );
    }

    private AdminUserAccountResponse toResponse(User user) {
        AdminUserAccountResponse response = new AdminUserAccountResponse();

        response.setUserId(user.getId());
        response.setFullName(user.getFullName());
        response.setEmail(user.getEmail());
        response.setEmployeeCode(user.getEmployeeCode());
        response.setEmployeeId(user.getEmployeeId());
        response.setDepartmentId(user.getDepartmentId());
        response.setActive(user.getActive() == null || user.getActive());
        response.setAccountStatus(user.getAccountStatus());
        response.setMustChangePassword(Boolean.TRUE.equals(user.getMustChangePassword()));

        userProfileRepository.findByUserId(user.getId()).ifPresent(profile -> {
            response.setPhoneNumber(profile.getPhoneNumber());
            response.setProfileImageData(profile.getProfileImageData());
            response.setProfileImageType(profile.getProfileImageType());
        });

        if (user.getDepartmentId() != null) {
            departmentRepository.findById(user.getDepartmentId())
                    .map(Department::getDepartmentName)
                    .ifPresent(response::setDepartmentName);
        }

        if (user.getPosition() != null) {
            response.setPositionId(user.getPosition().getId());
            response.setPositionName(user.getPosition().getPositionTitle());
        }

        List<UserRole> roles = userRoleRepository.findByUserId(user.getId());

        if (!roles.isEmpty()) {
            Integer roleId = roles.get(0).getRoleId();

            roleRepository.findById(roleId)
                    .map(Role::getName)
                    .map(this::normalizeRoleName)
                    .ifPresent(response::setRoleName);
        } else {
            response.setRoleName("EMPLOYEE");
        }

        return response;
    }

    private String normalizeRoleName(String roleName) {
        String value = clean(roleName);

        if (value == null) {
            return "EMPLOYEE";
        }

        String normalized = value
                .replaceFirst("(?i)^ROLE_", "")
                .replaceAll("([a-z])([A-Z])", "$1_$2")
                .replaceAll("[\\s/-]+", "_")
                .replaceAll("^_+|_+$", "")
                .trim()
                .toUpperCase(Locale.ROOT);

        return switch (normalized) {
            case "PROJECT_MANAGER", "PROJECTMANAGER", "TEAM_MANAGER", "PM" -> "MANAGER";
            case "DEPARTMENTHEAD", "DEPT_HEAD", "HEAD_OF_DEPARTMENT" -> "DEPARTMENT_HEAD";
            case "EXECUTIVE", "CEO" -> "CEO";
            case "ADMIN" -> "ADMIN";
            case "HR" -> "HR";
            case "MANAGER" -> "MANAGER";
            case "DEPARTMENT_HEAD" -> "DEPARTMENT_HEAD";
            case "EMPLOYEE" -> "EMPLOYEE";
            default -> "EMPLOYEE";
        };
    }

    private String cleanEmail(String value) {
        String cleaned = clean(value);
        return cleaned == null ? null : cleaned.toLowerCase(Locale.ROOT);
    }

    private String clean(String value) {
        if (value == null) {
            return null;
        }

        String cleaned = value.trim();

        if (cleaned.isEmpty()
                || cleaned.equalsIgnoreCase("null")
                || cleaned.equalsIgnoreCase("nil")
                || cleaned.equalsIgnoreCase("n/a")
                || cleaned.equals("-")) {
            return null;
        }

        return cleaned;
    }

    @Data
    public static class AdminUserAccountUpdateRequest {
        private String fullName;
        private String email;
        private String employeeCode;
        private Integer departmentId;
        private Integer positionId;
        private String roleName;
        private Boolean active;
    }

    @Data
    public static class AdminUserAccountResponse {
        private Integer userId;
        private Integer employeeId;
        private String fullName;
        private String email;
        private String employeeCode;

        private Integer departmentId;
        private String departmentName;

        private Integer positionId;
        private String positionName;

        private String roleName;

        private Boolean active;
        private String accountStatus;
        private Boolean mustChangePassword;

        private String phoneNumber;
        private String profileImageData;
        private String profileImageType;

        private Boolean temporaryPasswordEmailSent;
        private String message;
        private String smtpErrorDetail;
    }
}