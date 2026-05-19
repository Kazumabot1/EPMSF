package com.epms.security;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.server.ResponseStatusException;

import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Single place for "may this user apply KPI templates to departments?" — used by Spring Security
 * and {@link com.epms.controller.KpiTemplateController}.
 */
public final class HrKpiTemplateAuthority {

    private static final Pattern HR_WORD_BOUNDARY = Pattern.compile("\\bhr\\b", Pattern.CASE_INSENSITIVE);

    private static final Pattern HUMAN_RESOURCES_PHRASE =
            Pattern.compile("human\\s+resources", Pattern.CASE_INSENSITIVE);

    private static final Set<String> HR_ROLES = Set.of(
            "HR",
            "HUMAN_RESOURCE",
            "HUMAN_RESOURCES",
            "HR_MANAGER",
            "HR_ADMIN",
            "PEOPLE",
            "PEOPLE_OPS",
            "TALENT",
            "ADMIN"
    );

    private static final Set<String> HR_DASHBOARDS = Set.of(
            "HR_DASHBOARD",
            "ADMIN_DASHBOARD"
    );

    private HrKpiTemplateAuthority() {
    }

    public static void requireMayApplyTemplateToDepartment(UserPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated.");
        }
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        auth.setAuthenticated(true);
        if (!mayManageKpiTemplates(auth)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You do not have permission to apply KPI templates. HR or admin access is required."
            );
        }
    }

    public static boolean mayManageKpiTemplates(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        if (matchesHrManagementBundle(authentication)) {
            return true;
        }
        if (matchesHrOrAdminRelaxed(authentication)) {
            return true;
        }
        if (authentication.getPrincipal() instanceof UserPrincipal up && hrProfileSignalsHr(up)) {
            return true;
        }
        return false;
    }

    private static boolean matchesHrManagementBundle(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (principal == null || "anonymousUser".equals(principal)) {
            return false;
        }

        if (principal instanceof UserPrincipal userPrincipal) {
            String dashboard = normalizeAuthorityName(userPrincipal.getDashboard());
            if (!dashboard.isBlank() && HR_DASHBOARDS.contains(dashboard)) {
                return true;
            }

            if (userPrincipal.getRoles() != null) {
                for (String role : userPrincipal.getRoles()) {
                    String normalizedRole = normalizeAuthorityName(role);
                    if (HR_ROLES.contains(normalizedRole)) {
                        return true;
                    }
                    if (HR_ROLES.contains("HR") && isHrLike(normalizedRole)) {
                        return true;
                    }
                }
            }

            String normalizedPosition = normalizeAuthorityName(userPrincipal.getPosition());
            if (HR_ROLES.contains("HR") && isHrLike(normalizedPosition)) {
                return true;
            }
        }

        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if (authority == null) {
                continue;
            }
            String normalizedAuthority = normalizeAuthorityName(authority.getAuthority());
            if (HR_ROLES.contains(normalizedAuthority)) {
                return true;
            }
            if (HR_ROLES.contains("HR") && isHrLike(normalizedAuthority)) {
                return true;
            }
        }

        return false;
    }

    private static boolean matchesHrOrAdminRelaxed(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (principal == null || "anonymousUser".equals(principal)) {
            return false;
        }

        if (principal instanceof UserPrincipal userPrincipal) {
            String dashboard = normalizeAuthorityName(userPrincipal.getDashboard());
            if ("HR_DASHBOARD".equals(dashboard) || "ADMIN_DASHBOARD".equals(dashboard)) {
                return true;
            }

            if (userPrincipal.getRoles() != null) {
                for (String role : userPrincipal.getRoles()) {
                    String normalizedRole = normalizeAuthorityName(role);
                    if ("ADMIN".equals(normalizedRole) || isHrLike(normalizedRole)) {
                        return true;
                    }
                }
            }

            String normalizedPosition = normalizeAuthorityName(userPrincipal.getPosition());
            if (isHrLike(normalizedPosition)) {
                return true;
            }
        }

        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if (authority == null) {
                continue;
            }
            String normalizedAuthority = normalizeAuthorityName(authority.getAuthority());
            if ("ADMIN".equals(normalizedAuthority) || isHrLike(normalizedAuthority)) {
                return true;
            }
        }

        return false;
    }

    private static boolean hrProfileSignalsHr(UserPrincipal up) {
        String blob =
                Stream.of(up.getPosition(), up.getFullName())
                        .filter(Objects::nonNull)
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.joining(" "));
        if (blob.isEmpty()) {
            return false;
        }
        if (HR_WORD_BOUNDARY.matcher(blob).find()) {
            return true;
        }
        return HUMAN_RESOURCES_PHRASE.matcher(blob).find();
    }

    private static boolean isHrLike(String normalizedValue) {
        if (normalizedValue == null || normalizedValue.isBlank()) {
            return false;
        }

        return normalizedValue.equals("HR")
                || normalizedValue.equals("HUMAN_RESOURCE")
                || normalizedValue.equals("HUMAN_RESOURCES")
                || normalizedValue.equals("HR_MANAGER")
                || normalizedValue.equals("HR_ADMIN")
                || normalizedValue.equals("PEOPLE")
                || normalizedValue.equals("PEOPLE_OPS")
                || normalizedValue.equals("TALENT")
                || normalizedValue.contains("_HR")
                || normalizedValue.contains("HR_")
                || normalizedValue.contains("HUMAN_RESOURCE")
                || normalizedValue.contains("HUMAN_RESOURCES")
                || normalizedValue.contains("PEOPLE")
                || normalizedValue.contains("TALENT");
    }

    private static String normalizeAuthorityName(String value) {
        if (value == null) {
            return "";
        }

        return value
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("([a-z])([A-Z])", "$1_$2")
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase();
    }
}
