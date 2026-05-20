

package com.epms.config;

import com.epms.security.JwtAuthenticationFilter;
import com.epms.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    private static final Set<String> ADMIN_ROLES = Set.of(
            "ADMIN"
    );

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

    private static final Set<String> MANAGER_ROLES = Set.of(
            "MANAGER",
            "PROJECT_MANAGER",
            "TEAM_MANAGER"
    );

    private static final Set<String> DEPARTMENT_HEAD_ROLES = Set.of(
            "DEPARTMENT_HEAD",
            "DEPARTMENTHEAD",
            "DEPT_HEAD",
            "HEAD_OF_DEPARTMENT"
    );

    private static final Set<String> EXECUTIVE_ROLES = Set.of(
            "CEO",
            "EXECUTIVE"
    );

    private static final Set<String> SCORE_TABLE_ROLES = Set.of(
            "HR",
            "HUMAN_RESOURCE",
            "HUMAN_RESOURCES",
            "HR_MANAGER",
            "HR_ADMIN",
            "PEOPLE",
            "PEOPLE_OPS",
            "TALENT",
            "ADMIN",

            "MANAGER",
            "PROJECT_MANAGER",
            "TEAM_MANAGER",

            "DEPARTMENT_HEAD",
            "DEPARTMENTHEAD",
            "DEPT_HEAD",
            "HEAD_OF_DEPARTMENT"
    );

    private static final Set<String> ADMIN_DASHBOARDS = Set.of(
            "ADMIN_DASHBOARD"
    );

    private static final Set<String> HR_DASHBOARDS = Set.of(
            "HR_DASHBOARD",
            "ADMIN_DASHBOARD"
    );

    private static final Set<String> MANAGER_DASHBOARDS = Set.of(
            "MANAGER_DASHBOARD"
    );

    private static final Set<String> DEPARTMENT_HEAD_DASHBOARDS = Set.of(
            "DEPARTMENT_HEAD_DASHBOARD",
            "DEPARTMENTHEAD_DASHBOARD",
            "DEPT_HEAD_DASHBOARD"
    );

    private static final Set<String> EXECUTIVE_DASHBOARDS = Set.of(
            "EXECUTIVE_DASHBOARD",
            "CEO_DASHBOARD"
    );

    private static final Set<String> SCORE_TABLE_DASHBOARDS = Set.of(
            "HR_DASHBOARD",
            "ADMIN_DASHBOARD",
            "MANAGER_DASHBOARD",
            "DEPARTMENT_HEAD_DASHBOARD",
            "DEPARTMENTHEAD_DASHBOARD",
            "DEPT_HEAD_DASHBOARD"
    );

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        .requestMatchers(
                                "/ws",
                                "/ws/**"
                        ).permitAll()

                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/refresh").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/logout").permitAll()

                        .requestMatchers(
                                "/api/auth/me",
                                "/api/auth/change-password"
                        ).authenticated()

                        .requestMatchers(
                                "/api/notifications",
                                "/api/notifications/**"
                        ).authenticated()

                        .requestMatchers(
                                "/api/signatures",
                                "/api/signatures/**"
                        ).authenticated()

                        .requestMatchers(
                                "/api/appraisal-forms",
                                "/api/appraisal-forms/**"
                        ).access((authentication, context) -> isHrOrAdmin(authentication.get()))

                        .requestMatchers(HttpMethod.GET,
                                "/api/departments",
                                "/api/departments/**",
                                "/api/employees/active-by-department/**"
                        ).authenticated()

                        /*
                         * Employee APIs are protected again at controller level with explicit HR/Admin
                         * + dashboard fallback checks. Keep the filter-chain requirement here simple so
                         * HR users who land on the HR dashboard via position-role mapping do not get
                         * blocked before controller-level auth runs.
                         */
                        .requestMatchers(
                                "/api/employees",
                                "/api/employees/**"
                        ).authenticated()

                        .requestMatchers(
                                "/api/one-on-one-meetings",
                                "/api/one-on-one-meetings/**",
                                "/api/one-on-one-action-items",
                                "/api/one-on-one-action-items/**"
                        ).authenticated()

                        /*
                         * Admin user/access-control APIs.
                         * This explicitly covers GET/POST/PUT/PATCH/DELETE for /api/users/**.
                         */
                        .requestMatchers(
                                "/api/users",
                                "/api/users/**",
                                "/api/roles",
                                "/api/roles/**",
                                "/api/permissions",
                                "/api/permissions/**",
                                "/api/role-permissions",
                                "/api/role-permissions/**",
                                "/api/user-roles",
                                "/api/user-roles/**"
                        ).access((authentication, context) ->
                                hasRoleDashboardOrPosition(authentication.get(), ADMIN_ROLES, ADMIN_DASHBOARDS)
                        )

                        /*.requestMatchers(
                                "/api/dashboard",
                                "/api/dashboard/**",
                                "/api/hr/employee-accounts",
                                "/api/hr/employee-accounts/**",

                                "/api/assessment-forms",
                                "/api/assessment-forms/**",

                                "/api/appraisal/templates",
                                "/api/appraisal/templates/**",
                                "/api/hr/appraisal/templates",
                                "/api/hr/appraisal/templates/**",
                                "/api/appraisal/cycles",
                                "/api/appraisal/cycles/**",
                                "/api/hr/appraisal/cycles",
                                "/api/hr/appraisal/cycles/**",
                                "/api/hr/appraisal/score-bands",
                                "/api/hr/appraisal/score-bands/**",

                                "/api/kpis",
                                "/api/kpis/**",
                                "/api/kpi-units",
                                "/api/kpi-units/**",
                                "/api/kpi-categories",
                                "/api/kpi-categories/**",
                                "/api/kpi-items",
                                "/api/kpi-items/**",
                                "/api/hr/kpi-templates",
                                "/api/hr/kpi-templates/**",

                                "/api/positions",
                                "/api/positions/**",
                                "/api/position-levels",
                                "/api/position-levels/**",

                                "/api/departments",
                                "/api/departments/**",
                                "/api/teams",
                                "/api/teams/**",

                                "/api/notification-templates",
                                "/api/notification-templates/**",
                                "/api/pip-updates",
                                "/api/pip-updates/**"
                        ).access((authentication, context) ->
                                hasRoleDashboardOrPosition(authentication.get(), HR_ROLES, HR_DASHBOARDS)
                        )*/
                        .requestMatchers(
                                "/api/teams",
                                "/api/teams/**"
                        ).authenticated()

                        .requestMatchers(
                                "/api/dashboard",
                                "/api/dashboard/**",
                                "/api/hr/employee-accounts",
                                "/api/hr/employee-accounts/**",

                                "/api/assessment-forms",
                                "/api/assessment-forms/**",

                                "/api/appraisal/templates",
                                "/api/appraisal/templates/**",
                                "/api/hr/appraisal/templates",
                                "/api/hr/appraisal/templates/**",
                                "/api/appraisal/cycles",
                                "/api/appraisal/cycles/**",
                                "/api/hr/appraisal/cycles",
                                "/api/hr/appraisal/cycles/**",
                                "/api/hr/appraisal/score-bands",
                                "/api/hr/appraisal/score-bands/**",

                                "/api/kpis",
                                "/api/kpis/**",
                                "/api/kpi-units",
                                "/api/kpi-units/**",
                                "/api/kpi-categories",
                                "/api/kpi-categories/**",
                                "/api/kpi-items",
                                "/api/kpi-items/**",
                                "/api/hr/kpi-templates",
                                "/api/hr/kpi-templates/**",

                                "/api/positions",
                                "/api/positions/**",
                                "/api/position-levels",
                                "/api/position-levels/**",

                                "/api/departments",
                                "/api/departments/**",

                                "/api/notification-templates",
                                "/api/notification-templates/**",
                                "/api/pip-updates",
                                "/api/pip-updates/**"
                        ).access((authentication, context) ->
                                hasRoleDashboardOrPosition(authentication.get(), HR_ROLES, HR_DASHBOARDS)
                        )

                        .requestMatchers(
                                "/api/manager",
                                "/api/manager/**"
                        ).access((authentication, context) ->
                                hasRoleDashboardOrPosition(authentication.get(), MANAGER_ROLES, MANAGER_DASHBOARDS)
                        )

                        .requestMatchers(
                                "/api/department-head",
                                "/api/department-head/**"
                        ).access((authentication, context) ->
                                hasRoleDashboardOrPosition(authentication.get(), DEPARTMENT_HEAD_ROLES, DEPARTMENT_HEAD_DASHBOARDS)
                        )

                        .requestMatchers(
                                "/api/executive",
                                "/api/executive/**"
                        ).access((authentication, context) ->
                                hasRoleDashboardOrPosition(authentication.get(), EXECUTIVE_ROLES, EXECUTIVE_DASHBOARDS)
                        )

                        .requestMatchers(
                                "/api/appraisal-reviews",
                                "/api/appraisal-reviews/**"
                        ).access((authentication, context) ->
                                hasRoleDashboardOrPosition(authentication.get(), EXECUTIVE_ROLES, EXECUTIVE_DASHBOARDS)
                        )

                        .requestMatchers(HttpMethod.GET, "/api/employee-assessments/template").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/employee-assessments/my-latest-draft").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/employee-assessments/my-scores").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/employee-assessments").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/employee-assessments/{id}").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/employee-assessments/{id}/submit").authenticated()

                        .requestMatchers(HttpMethod.GET, "/api/employee-assessments/score-table")
                        .access((authentication, context) ->
                                hasRoleDashboardOrPosition(authentication.get(), SCORE_TABLE_ROLES, SCORE_TABLE_DASHBOARDS)
                        )

                        .requestMatchers(HttpMethod.GET, "/api/employee-assessments/{id}")
                        .access((authentication, context) ->
                                hasRoleDashboardOrPosition(authentication.get(), SCORE_TABLE_ROLES, SCORE_TABLE_DASHBOARDS)
                        )

                        .requestMatchers(HttpMethod.POST, "/api/employee-assessments/{id}/manager-remark")
                        .access((authentication, context) ->
                                hasRoleDashboardOrPosition(authentication.get(), MANAGER_ROLES, MANAGER_DASHBOARDS)
                        )

                        .requestMatchers(HttpMethod.POST, "/api/employee-assessments/{id}/manager-sign")
                        .access((authentication, context) ->
                                hasRoleDashboardOrPosition(authentication.get(), MANAGER_ROLES, MANAGER_DASHBOARDS)
                        )

                        .requestMatchers(HttpMethod.POST, "/api/employee-assessments/{id}/department-head-sign")
                        .access((authentication, context) ->
                                hasRoleDashboardOrPosition(authentication.get(), DEPARTMENT_HEAD_ROLES, DEPARTMENT_HEAD_DASHBOARDS)
                        )

                        .requestMatchers(HttpMethod.POST, "/api/employee-assessments/{id}/hr-approve")
                        .access((authentication, context) ->
                                hasRoleDashboardOrPosition(authentication.get(), HR_ROLES, HR_DASHBOARDS)
                        )

                        .requestMatchers(HttpMethod.POST, "/api/employee-assessments/{id}/hr-decline")
                        .access((authentication, context) ->
                                hasRoleDashboardOrPosition(authentication.get(), HR_ROLES, HR_DASHBOARDS)
                        )

                        .requestMatchers(
                                "/api/appraisal/workflow",
                                "/api/appraisal/workflow/**",
                                "/api/pip",
                                "/api/pip/**",
                                "/api/pips",
                                "/api/pips/**",
                                "/api/v1/feedback",
                                "/api/v1/feedback/**"
                        ).authenticated()

                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private AuthorizationDecision isHrOrAdmin(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return new AuthorizationDecision(false);
        }

        Object principal = authentication.getPrincipal();

        if (principal == null || "anonymousUser".equals(principal)) {
            return new AuthorizationDecision(false);
        }

        if (principal instanceof UserPrincipal userPrincipal) {
            String dashboard = normalizeAuthorityName(userPrincipal.getDashboard());

            if ("HR_DASHBOARD".equals(dashboard) || "ADMIN_DASHBOARD".equals(dashboard)) {
                return new AuthorizationDecision(true);
            }

            if (userPrincipal.getRoles() != null) {
                for (String role : userPrincipal.getRoles()) {
                    String normalizedRole = normalizeAuthorityName(role);

                    if ("ADMIN".equals(normalizedRole) || isHrLike(normalizedRole)) {
                        return new AuthorizationDecision(true);
                    }
                }
            }

            String normalizedPosition = normalizeAuthorityName(userPrincipal.getPosition());

            if (isHrLike(normalizedPosition)) {
                return new AuthorizationDecision(true);
            }
        }

        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if (authority == null) {
                continue;
            }

            String normalizedAuthority = normalizeAuthorityName(authority.getAuthority());

            if ("ADMIN".equals(normalizedAuthority) || isHrLike(normalizedAuthority)) {
                return new AuthorizationDecision(true);
            }
        }

        return new AuthorizationDecision(false);
    }

    private AuthorizationDecision hasRoleDashboardOrPosition(
            Authentication authentication,
            Set<String> allowedRoles,
            Set<String> allowedDashboards
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return new AuthorizationDecision(false);
        }

        Object principal = authentication.getPrincipal();

        if (principal == null || "anonymousUser".equals(principal)) {
            return new AuthorizationDecision(false);
        }

        Set<String> normalizedAllowedRoles = allowedRoles
                .stream()
                .map(this::normalizeAuthorityName)
                .collect(Collectors.toSet());

        Set<String> normalizedAllowedDashboards = allowedDashboards
                .stream()
                .map(this::normalizeAuthorityName)
                .collect(Collectors.toSet());

        if (principal instanceof UserPrincipal userPrincipal) {
            String dashboard = normalizeAuthorityName(userPrincipal.getDashboard());

            if (normalizedAllowedDashboards.contains(dashboard)) {
                return new AuthorizationDecision(true);
            }

            if (userPrincipal.getRoles() != null) {
                for (String role : userPrincipal.getRoles()) {
                    String normalizedRole = normalizeAuthorityName(role);

                    if (normalizedAllowedRoles.contains(normalizedRole)) {
                        return new AuthorizationDecision(true);
                    }

                    if (normalizedAllowedRoles.contains("HR") && isHrLike(normalizedRole)) {
                        return new AuthorizationDecision(true);
                    }

                    if (normalizedAllowedRoles.contains("MANAGER") && isManagerLike(normalizedRole)) {
                        return new AuthorizationDecision(true);
                    }

                    if (normalizedAllowedRoles.contains("DEPARTMENT_HEAD") && isDepartmentHeadLike(normalizedRole)) {
                        return new AuthorizationDecision(true);
                    }

                    if (normalizedAllowedRoles.contains("CEO") && isExecutiveLike(normalizedRole)) {
                        return new AuthorizationDecision(true);
                    }
                }
            }

            String normalizedPosition = normalizeAuthorityName(userPrincipal.getPosition());

            if (normalizedAllowedRoles.contains("HR") && isHrLike(normalizedPosition)) {
                return new AuthorizationDecision(true);
            }

            if (normalizedAllowedRoles.contains("MANAGER") && isManagerLike(normalizedPosition)) {
                return new AuthorizationDecision(true);
            }

            if (normalizedAllowedRoles.contains("DEPARTMENT_HEAD") && isDepartmentHeadLike(normalizedPosition)) {
                return new AuthorizationDecision(true);
            }

            if (normalizedAllowedRoles.contains("CEO") && isExecutiveLike(normalizedPosition)) {
                return new AuthorizationDecision(true);
            }
        }

        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if (authority == null) {
                continue;
            }

            String normalizedAuthority = normalizeAuthorityName(authority.getAuthority());

            if (normalizedAllowedRoles.contains(normalizedAuthority)) {
                return new AuthorizationDecision(true);
            }

            if (normalizedAllowedRoles.contains("HR") && isHrLike(normalizedAuthority)) {
                return new AuthorizationDecision(true);
            }

            if (normalizedAllowedRoles.contains("MANAGER") && isManagerLike(normalizedAuthority)) {
                return new AuthorizationDecision(true);
            }

            if (normalizedAllowedRoles.contains("DEPARTMENT_HEAD") && isDepartmentHeadLike(normalizedAuthority)) {
                return new AuthorizationDecision(true);
            }

            if (normalizedAllowedRoles.contains("CEO") && isExecutiveLike(normalizedAuthority)) {
                return new AuthorizationDecision(true);
            }
        }

        return new AuthorizationDecision(false);
    }

    private boolean isHrLike(String normalizedValue) {
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

    private boolean isManagerLike(String normalizedValue) {
        if (normalizedValue == null || normalizedValue.isBlank()) {
            return false;
        }

        return normalizedValue.equals("MANAGER")
                || normalizedValue.equals("PROJECT_MANAGER")
                || normalizedValue.equals("TEAM_MANAGER")
                || normalizedValue.contains("MANAGER");
    }

    private boolean isDepartmentHeadLike(String normalizedValue) {
        if (normalizedValue == null || normalizedValue.isBlank()) {
            return false;
        }

        return normalizedValue.equals("DEPARTMENT_HEAD")
                || normalizedValue.equals("DEPARTMENTHEAD")
                || normalizedValue.equals("DEPT_HEAD")
                || normalizedValue.equals("HEAD_OF_DEPARTMENT")
                || normalizedValue.contains("DEPARTMENT_HEAD")
                || normalizedValue.contains("DEPARTMENTHEAD")
                || normalizedValue.contains("DEPT_HEAD")
                || normalizedValue.contains("HEAD_OF_DEPARTMENT");
    }

    private boolean isExecutiveLike(String normalizedValue) {
        if (normalizedValue == null || normalizedValue.isBlank()) {
            return false;
        }

        return normalizedValue.equals("CEO")
                || normalizedValue.equals("EXECUTIVE")
                || normalizedValue.contains("CEO")
                || normalizedValue.contains("EXECUTIVE");
    }

    private String normalizeAuthorityName(String value) {
        if (value == null) {
            return "";
        }

        return value
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("([a-z])([A-Z])", "$1_$2")
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase(Locale.ROOT);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOrigins(List.of(
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:5175",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:5174",
                "http://127.0.0.1:5175"
        ));

        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration configuration
    ) throws Exception {
        return configuration.getAuthenticationManager();
    }
}
