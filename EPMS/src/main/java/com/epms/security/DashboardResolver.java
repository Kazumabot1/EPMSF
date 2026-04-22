package com.epms.security;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DashboardResolver {

    public String resolveDashboard(List<String> roles, String position) {
        List<String> normalizedRoles = roles == null
                ? List.of()
                : roles.stream().map(String::toUpperCase).toList();

        String normalizedPosition = position == null ? "" : position.trim().toUpperCase();

        if (hasRole(normalizedRoles, "ROLE_ADMIN") || hasRole(normalizedRoles, "ADMIN")) {
            return "ADMIN_DASHBOARD";
        }

        if (hasRole(normalizedRoles, "ROLE_HR") || hasRole(normalizedRoles, "HR")) {
            return "HR_DASHBOARD";
        }

        if (hasRole(normalizedRoles, "ROLE_CEO") || hasRole(normalizedRoles, "CEO")
                || hasRole(normalizedRoles, "ROLE_EXECUTIVE") || hasRole(normalizedRoles, "EXECUTIVE")) {
            return "EXECUTIVE_DASHBOARD";
        }

        if (hasRole(normalizedRoles, "ROLE_DEPARTMENT_HEAD") || hasRole(normalizedRoles, "DEPARTMENT_HEAD")) {
            return "DEPARTMENT_HEAD_DASHBOARD";
        }

        if (hasRole(normalizedRoles, "ROLE_MANAGER") || hasRole(normalizedRoles, "MANAGER")) {
            return "MANAGER_DASHBOARD";
        }

        if (hasRole(normalizedRoles, "ROLE_EMPLOYEE") || hasRole(normalizedRoles, "EMPLOYEE")) {
            return "EMPLOYEE_DASHBOARD";
        }

        if (normalizedPosition.contains("HR")) {
            return "HR_DASHBOARD";
        }
        if (normalizedPosition.contains("CEO") || normalizedPosition.contains("EXECUTIVE")) {
            return "EXECUTIVE_DASHBOARD";
        }
        if (normalizedPosition.contains("DEPARTMENT HEAD") || normalizedPosition.contains("HEAD")) {
            return "DEPARTMENT_HEAD_DASHBOARD";
        }
        if (normalizedPosition.contains("MANAGER")) {
            return "MANAGER_DASHBOARD";
        }

        return "EMPLOYEE_DASHBOARD";
    }

    private boolean hasRole(List<String> roles, String target) {
        return roles.stream().anyMatch(role -> role.equalsIgnoreCase(target));
    }
}