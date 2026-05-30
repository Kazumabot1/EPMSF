package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.entity.Role;
import com.epms.repository.RoleRepository;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/positions/dashboard-roles")
@RequiredArgsConstructor
public class PositionDashboardRoleController {

    private final RoleRepository roleRepository;

    private static final Map<String, Integer> ROLE_ORDER = Map.of(
            "EMPLOYEE", 1,
            "MANAGER", 2,
            "DEPARTMENT_HEAD", 3,
            "HR", 4,
            "CEO", 5,
            "HRADMIN", 6
    );

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<GenericApiResponse<List<DashboardRoleResponse>>> getDashboardRoles() {
        List<DashboardRoleResponse> roles = roleRepository.findAll()
                .stream()
                .filter(role -> role.getActive() == null || Boolean.TRUE.equals(role.getActive()))
                .map(this::toDashboardRole)
                .filter(Objects::nonNull)
                .sorted(
                        Comparator
                                .comparing((DashboardRoleResponse role) ->
                                        ROLE_ORDER.getOrDefault(role.getName(), 999)
                                )
                                .thenComparing(DashboardRoleResponse::getLabel, String.CASE_INSENSITIVE_ORDER)
                )
                .toList();

        return ResponseEntity.ok(
                GenericApiResponse.success("Dashboard roles fetched", roles)
        );
    }

    private DashboardRoleResponse toDashboardRole(Role role) {
        if (role == null || role.getId() == null || role.getName() == null) {
            return null;
        }

        String normalized = normalizeRoleName(role.getName());

        if (!ROLE_ORDER.containsKey(normalized)) {
            return null;
        }

        return new DashboardRoleResponse(
                role.getId(),
                normalized,
                displayRoleName(normalized),
                dashboardForRole(normalized)
        );
    }

    private String normalizeRoleName(String roleName) {
        if (roleName == null) {
            return "";
        }

        String normalized = roleName
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("([a-z])([A-Z])", "$1_$2")
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase(Locale.ROOT);

        return switch (normalized) {
            case "PROJECT_MANAGER", "PROJECTMANAGER", "TEAM_MANAGER", "PM" -> "MANAGER";
            case "DEPARTMENTHEAD", "DEPT_HEAD", "DEPTHEAD", "HEAD_OF_DEPARTMENT" -> "DEPARTMENT_HEAD";
            case "EXECUTIVE", "CEO" -> "CEO";
            case "HRADMIN" -> "HRADMIN";
            case "HR" -> "HR";
            case "MANAGER" -> "MANAGER";
            case "DEPARTMENT_HEAD" -> "DEPARTMENT_HEAD";
            case "EMPLOYEE" -> "EMPLOYEE";
            default -> normalized;
        };
    }

    private String displayRoleName(String roleName) {
        return switch (roleName) {
            case "HRADMIN" -> "HR Admin";
            case "HR" -> "HR";
            case "CEO" -> "CEO / Executive";
            case "DEPARTMENT_HEAD" -> "Department Head";
            case "MANAGER" -> "Manager";
            case "EMPLOYEE" -> "Employee";
            default -> roleName;
        };
    }

    private String dashboardForRole(String roleName) {
        return switch (roleName) {
            case "HRADMIN" -> "HRADMIN_DASHBOARD";
            case "HR" -> "HR_DASHBOARD";
            case "CEO" -> "EXECUTIVE_DASHBOARD";
            case "DEPARTMENT_HEAD" -> "DEPARTMENT_HEAD_DASHBOARD";
            case "MANAGER" -> "MANAGER_DASHBOARD";
            case "EMPLOYEE" -> "EMPLOYEE_DASHBOARD";
            default -> "EMPLOYEE_DASHBOARD";
        };
    }

    @Data
    @AllArgsConstructor
    public static class DashboardRoleResponse {
        private Integer id;
        private String name;
        private String label;
        private String dashboard;
    }
}