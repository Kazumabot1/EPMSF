package com.epms.security;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Set;

@Component
public class DashboardResolver {

    private static final Set<String> SUPPORTED_DASHBOARDS = Set.of(
            "ADMIN_DASHBOARD",
            "HR_DASHBOARD",
            "EXECUTIVE_DASHBOARD",
            "DEPARTMENT_HEAD_DASHBOARD",
            "MANAGER_DASHBOARD",
            "EMPLOYEE_DASHBOARD"
    );

    public String resolveDashboard(List<String> roles) {
        List<String> normalizedRoles = roles == null
                ? List.of()
                : roles.stream().map(this::normalizeRoleName).toList();

        if (hasRole(normalizedRoles, "ADMIN")) {
            return "ADMIN_DASHBOARD";
        }

        if (hasRole(normalizedRoles, "HR")) {
            return "HR_DASHBOARD";
        }

        if (hasRole(normalizedRoles, "CEO") || hasRole(normalizedRoles, "EXECUTIVE")) {
            return "EXECUTIVE_DASHBOARD";
        }

        if (hasRole(normalizedRoles, "DEPARTMENT_HEAD") || hasRole(normalizedRoles, "DEPARTMENTHEAD")) {
            return "DEPARTMENT_HEAD_DASHBOARD";
        }

        if (hasRole(normalizedRoles, "MANAGER")) {
            return "MANAGER_DASHBOARD";
        }

        if (hasRole(normalizedRoles, "EMPLOYEE")) {
            return "EMPLOYEE_DASHBOARD";
        }

        return "EMPLOYEE_DASHBOARD";
    }

    public String normalizeDashboard(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        String normalized = value
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("([a-z])([A-Z])", "$1_$2")
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase(Locale.ROOT);

        return switch (normalized) {
            case "ADMIN", "ADMIN_DASHBOARD" -> "ADMIN_DASHBOARD";
            case "HR", "HR_DASHBOARD" -> "HR_DASHBOARD";
            case "CEO", "EXECUTIVE", "CEO_DASHBOARD", "EXECUTIVE_DASHBOARD" -> "EXECUTIVE_DASHBOARD";
            case "DEPARTMENT_HEAD", "DEPARTMENTHEAD", "DEPT_HEAD", "HEAD_OF_DEPARTMENT",
                 "DEPARTMENT_HEAD_DASHBOARD", "DEPARTMENTHEAD_DASHBOARD", "DEPT_HEAD_DASHBOARD" ->
                    "DEPARTMENT_HEAD_DASHBOARD";
            case "MANAGER", "PROJECT_MANAGER", "TEAM_MANAGER", "MANAGER_DASHBOARD" -> "MANAGER_DASHBOARD";
            case "EMPLOYEE", "EMPLOYEE_DASHBOARD" -> "EMPLOYEE_DASHBOARD";
            default -> null;
        };
    }

    public boolean isSupportedDashboard(String value) {
        String normalized = normalizeDashboard(value);
        return normalized != null && SUPPORTED_DASHBOARDS.contains(normalized);
    }

    private String normalizeRoleName(String value) {
        if (value == null) return "";

        String normalized = value
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("([a-z])([A-Z])", "$1_$2")
                .replaceAll("[\\s/-]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase(Locale.ROOT);

        if (normalized.equals("DEPARTMENTHEAD")
                || normalized.equals("DEPT_HEAD")
                || normalized.equals("HEAD_OF_DEPARTMENT")) {
            return "DEPARTMENT_HEAD";
        }

        if (normalized.equals("PROJECT_MANAGER")
                || normalized.equals("PROJECTMANAGER")
                || normalized.equals("TEAM_MANAGER")
                || normalized.equals("PM")) {
            return "MANAGER";
        }

        if (normalized.equals("CEO")) {
            return "CEO";
        }

        return normalized;
    }

    private boolean hasRole(List<String> roles, String target) {
        return roles.stream().anyMatch(role -> role.equalsIgnoreCase(target));
    }
}