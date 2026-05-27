package com.epms.controller;

import com.epms.dto.AccountProvisionResult;
import com.epms.dto.GenericApiResponse;
import com.epms.dto.HrEmployeeAccountCreateRequest;
import com.epms.entity.AuditLog;
import com.epms.entity.Department;
import com.epms.entity.Role;
import com.epms.entity.User;
import com.epms.entity.UserProfile;
import com.epms.entity.UserRole;
import com.epms.exception.BadRequestException;
import com.epms.repository.AuditLogRepository;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.RoleRepository;
import com.epms.repository.UserProfileRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.UserRoleRepository;
import com.epms.security.DashboardResolver;
import com.epms.security.SecurityUtils;
import com.epms.service.HrEmployeeAccountService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserAccountController {

    private static final String ENTITY_TYPE_USER_DASHBOARD = "USER_DASHBOARD";
    private static final String DASHBOARD_COLUMN = "dashboard";

    private final HrEmployeeAccountService hrEmployeeAccountService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final DepartmentRepository departmentRepository;
    private final UserProfileRepository userProfileRepository;
    private final AuditLogRepository auditLogRepository;
    private final DashboardResolver dashboardResolver;

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

    @GetMapping("/{id}/dashboard-audit")
    public ResponseEntity<GenericApiResponse<List<DashboardAuditResponse>>> getDashboardAudit(
            @PathVariable Integer id
    ) {
        User target = userRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("User not found"));

        List<DashboardAuditResponse> rows = auditLogRepository
                .findByEntityTypeAndEntityIdOrderByTimestampDesc(ENTITY_TYPE_USER_DASHBOARD, target.getId())
                .stream()
                .map(this::toDashboardAuditResponse)
                .toList();

        return ResponseEntity.ok(GenericApiResponse.success("Dashboard audit fetched", rows));
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

        String dashboard = resolveDashboardForSave(request.getDashboard(), request.getRoleName());
        String oldDashboard = user.getDashboard();

        user.setDashboard(dashboard);
        user.setUpdatedAt(new Date());
        user = userRepository.save(user);

        recordDashboardAuditIfChanged(
                user,
                oldDashboard,
                dashboard,
                "Dashboard assigned by Admin"
        );

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
        User existing = userRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("User not found"));

        String oldDashboard = existing.getDashboard();

        User user = hrEmployeeAccountService.updateAdminUserAccount(
                id,
                request.getFullName(),
                request.getEmail(),
                request.getEmployeeCode(),
                request.getDepartmentId(),
                request.getPositionId(),
                request.getManagerId(),
                request.getRoleName(),
                request.getActive()
        );

        String dashboard = resolveDashboardForSave(request.getDashboard(), request.getRoleName());

        user.setDashboard(dashboard);
        user.setUpdatedAt(new Date());
        user = userRepository.save(user);

        recordDashboardAuditIfChanged(
                user,
                oldDashboard,
                dashboard,
                "Dashboard changed by Admin"
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
        response.setManagerId(user.getManagerId());
        response.setManagerName(user.getManagerId() == null ? null : resolveUserDisplayName(user.getManagerId()));
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

        String dashboard = dashboardResolver.normalizeDashboard(user.getDashboard());

        if (dashboard == null) {
            dashboard = dashboardResolver.resolveDashboard(List.of(response.getRoleName()));
        }

        response.setDashboard(dashboard);

        return response;
    }

    private DashboardAuditResponse toDashboardAuditResponse(AuditLog log) {
        DashboardAuditResponse response = new DashboardAuditResponse();

        response.setId(log.getId());
        response.setChangedByUserId(log.getUserId());
        response.setChangedByName(resolveUserDisplayName(log.getUserId()));
        response.setOldDashboard(log.getOldValue());
        response.setNewDashboard(log.getNewValue());
        response.setReason(log.getReason());
        response.setTimestamp(log.getTimestamp());

        return response;
    }

    private String resolveUserDisplayName(Integer userId) {
        if (userId == null) {
            return "System";
        }

        return userRepository.findById(userId)
                .map(user -> {
                    if (user.getFullName() != null && !user.getFullName().isBlank()) {
                        return user.getFullName();
                    }
                    if (user.getEmail() != null && !user.getEmail().isBlank()) {
                        return user.getEmail();
                    }
                    return "User #" + user.getId();
                })
                .orElse("User #" + userId);
    }

    private void recordDashboardAuditIfChanged(
            User targetUser,
            String oldDashboardRaw,
            String newDashboardRaw,
            String reason
    ) {
        String oldDashboard = dashboardResolver.normalizeDashboard(oldDashboardRaw);
        String newDashboard = dashboardResolver.normalizeDashboard(newDashboardRaw);

        if (oldDashboard == null) {
            oldDashboard = "";
        }

        if (newDashboard == null) {
            newDashboard = "";
        }

        if (oldDashboard.equals(newDashboard)) {
            return;
        }

        AuditLog log = new AuditLog();
        log.setUserId(currentEditorId());
        log.setAction("UPDATE");
        log.setEntityType(ENTITY_TYPE_USER_DASHBOARD);
        log.setEntityId(targetUser.getId());
        log.setChangedColumn(DASHBOARD_COLUMN);
        log.setOldValue(oldDashboard);
        log.setNewValue(newDashboard);
        log.setReason(reason);
        log.setTimestamp(new Date());

        auditLogRepository.save(log);
    }

    private Integer currentEditorId() {
        try {
            return SecurityUtils.currentUserId();
        } catch (Exception ignored) {
            return null;
        }
    }

    private String resolveDashboardForSave(String dashboardRaw, String roleNameRaw) {
        String dashboard = dashboardResolver.normalizeDashboard(dashboardRaw);

        if (dashboard != null) {
            return dashboard;
        }

        String roleName = normalizeRoleName(roleNameRaw);
        return dashboardResolver.resolveDashboard(List.of(roleName));
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
        private Integer managerId;
        private String roleName;
        private String dashboard;
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

        private Integer managerId;
        private String managerName;

        private Integer positionId;
        private String positionName;

        private String roleName;
        private String dashboard;

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

    @Data
    public static class DashboardAuditResponse {
        private Integer id;
        private Integer changedByUserId;
        private String changedByName;
        private String oldDashboard;
        private String newDashboard;
        private String reason;
        private Date timestamp;
    }
}
