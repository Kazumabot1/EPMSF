package com.epms.config;

import com.epms.security.JwtAuthenticationFilter;
import com.epms.security.UserPrincipal;
import com.epms.service.PositionPermissionService;
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
    private final PositionPermissionService positionPermissionService;

    private static final Set<String> ADMIN_ROLES = Set.of("HRADMIN", "ADMIN");

    private static final Set<String> HR_ROLES = Set.of(
            "HR",
            "HUMAN_RESOURCE",
            "HUMAN_RESOURCES",
            "HR_MANAGER",
            "HR_ADMIN",
            "PEOPLE",
            "PEOPLE_OPS",
            "TALENT",
            "HRADMIN"
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

    private static final Set<String> KPI_EVALUATOR_ROLES = Set.of(
            "MANAGER",
            "PROJECT_MANAGER",
            "TEAM_MANAGER",
            "DEPARTMENT_HEAD",
            "DEPARTMENTHEAD",
            "DEPT_HEAD",
            "HEAD_OF_DEPARTMENT",
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
            "HRADMIN",
            "MANAGER",
            "PROJECT_MANAGER",
            "TEAM_MANAGER",
            "DEPARTMENT_HEAD",
            "DEPARTMENTHEAD",
            "DEPT_HEAD",
            "HEAD_OF_DEPARTMENT"
    );

    private static final Set<String> WORKFORCE_CHANGE_REVIEW_ROLES = Set.of(
            "HR",
            "HUMAN_RESOURCE",
            "HUMAN_RESOURCES",
            "HR_MANAGER",
            "HR_ADMIN",
            "PEOPLE",
            "PEOPLE_OPS",
            "TALENT",
            "HRADMIN"
    );

    private static final Set<String> HRADMIN_DASHBOARDS = Set.of(
            "HRADMIN_DASHBOARD",
            "ADMIN_DASHBOARD"
    );

    private static final Set<String> HR_DASHBOARDS = Set.of(
            "HR_DASHBOARD",
            "HRADMIN_DASHBOARD"
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

    private static final Set<String> KPI_EVALUATOR_DASHBOARDS = Set.of(
            "MANAGER_DASHBOARD",
            "DEPARTMENT_HEAD_DASHBOARD",
            "DEPARTMENTHEAD_DASHBOARD",
            "DEPT_HEAD_DASHBOARD",
            "EXECUTIVE_DASHBOARD",
            "CEO_DASHBOARD"
    );

    private static final Set<String> SCORE_TABLE_DASHBOARDS = Set.of(
            "HR_DASHBOARD",
            "HRADMIN_DASHBOARD",
            "MANAGER_DASHBOARD",
            "DEPARTMENT_HEAD_DASHBOARD",
            "DEPARTMENTHEAD_DASHBOARD",
            "DEPT_HEAD_DASHBOARD"
    );

    private static final Set<String> WORKFORCE_CHANGE_REVIEW_DASHBOARDS = Set.of(
            "HR_DASHBOARD",
            "HRADMIN_DASHBOARD"
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
                        .requestMatchers(HttpMethod.POST, "/api/auth/forgot-password/request").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/forgot-password/verify").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/forgot-password/reset").permitAll()

                        .requestMatchers(
                                "/api/auth/me",
                                "/api/auth/change-password"
                        ).authenticated()

                        .requestMatchers(
                                "/api/profile",
                                "/api/profile/**"
                        ).authenticated()

                        .requestMatchers(
                                "/api/notifications",
                                "/api/notifications/**"
                        ).authenticated()

                        .requestMatchers(
                                "/api/signatures",
                                "/api/signatures/**"
                        ).authenticated()

                        .requestMatchers(HttpMethod.GET,
                                "/api/roles",
                                "/api/roles/**",
                                "/api/employees/active-by-department/**"
                        ).authenticated()

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
                                hasRoleDashboardOrPosition(authentication.get(), ADMIN_ROLES, HRADMIN_DASHBOARDS)
                        )

                        /*
                         * Workforce Changes.
                         * Keep these above broad HR/common API rules.
                         */
                        .requestMatchers(
                                "/api/employee-change-requests/employees/*/profile"
                        ).access((authentication, context) ->
                                hasRoleDashboardOrPosition(
                                        authentication.get(),
                                        WORKFORCE_CHANGE_REVIEW_ROLES,
                                        WORKFORCE_CHANGE_REVIEW_DASHBOARDS
                                )
                        )

                        .requestMatchers(
                                "/api/employee-change-requests/hradmin/pending",
                                "/api/employee-change-requests/hradmin/*",
                                "/api/employee-change-requests/hradmin/*/approve",
                                "/api/employee-change-requests/hradmin/*/reject",
                                "/api/employee-change-requests/ceo/pending",
                                "/api/employee-change-requests/ceo/*",
                                "/api/employee-change-requests/ceo/*/approve",
                                "/api/employee-change-requests/ceo/*/reject"
                        ).access((authentication, context) ->
                                hasRoleDashboardOrPosition(authentication.get(), ADMIN_ROLES, HRADMIN_DASHBOARDS)
                        )

                        .requestMatchers(
                                "/api/hradmin/kpi-approvals",
                                "/api/hradmin/kpi-approvals/**",
                                "/api/hradmin/department-kpi-approvals",
                                "/api/hradmin/department-kpi-approvals/**",
                                "/api/executive/kpi-approvals",
                                "/api/executive/kpi-approvals/**",
                                "/api/executive/department-kpi-approvals",
                                "/api/executive/department-kpi-approvals/**"
                        ).access((authentication, context) ->
                                hasRoleDashboardOrPosition(authentication.get(), ADMIN_ROLES, HRADMIN_DASHBOARDS)
                        )

                        .requestMatchers(
                                "/api/employee-change-requests/hr",
                                "/api/employee-change-requests/position-change",
                                "/api/employee-change-requests/department-change",
                                "/api/employee-change-requests/*"
                        ).access((authentication, context) ->
                                hasRoleDashboardOrPosition(authentication.get(), HR_ROLES, HR_DASHBOARDS)
                        )

                        /*
                         * HR position-permission protected API groups.
                         * These rules must stay above the broad HR/common matcher rules.
                         */

                        /*
                         * Team APIs are split by action and scope.
                         * Important: specific /my-department, /my-teams, candidate, and history routes
                         * must stay above the broad /api/teams/** matcher so Department Heads can view
                         * their own department teams while create/edit/history remain permission controlled.
                         */
                        .requestMatchers(HttpMethod.GET,
                                "/api/teams/my-department/candidates/users",
                                "/api/teams/my-department/candidates/members",
                                "/api/teams/my-department/candidates/project-managers",
                                "/api/teams/candidates/users/**",
                                "/api/teams/candidates/members/**",
                                "/api/teams/candidates/project-managers/**"
                        ).access((authentication, context) ->
                                hasTeamPositionPermission(authentication.get(), "teamCreate")
                        )

                        .requestMatchers(HttpMethod.GET,
                                "/api/teams/my-department/*/history",
                                "/api/teams/*/history"
                        ).access((authentication, context) ->
                                hasTeamPositionPermission(authentication.get(), "teamHistory")
                        )

                        .requestMatchers(HttpMethod.GET,
                                "/api/teams/my-department"
                        ).access((authentication, context) ->
                                hasMyDepartmentTeamViewAccess(authentication.get())
                        )

                        .requestMatchers(HttpMethod.GET,
                                "/api/teams/my-teams"
                        ).authenticated()

                        .requestMatchers(HttpMethod.POST,
                                "/api/teams/my-department",
                                "/api/teams"
                        ).access((authentication, context) ->
                                hasTeamPositionPermission(authentication.get(), "teamCreate")
                        )

                        .requestMatchers(HttpMethod.PUT,
                                "/api/teams/my-department/**",
                                "/api/teams/**"
                        ).access((authentication, context) ->
                                hasTeamPositionPermission(authentication.get(), "teamEdit")
                        )

                        .requestMatchers(HttpMethod.DELETE,
                                "/api/teams/**"
                        ).access((authentication, context) ->
                                hasRoleDashboardOrPosition(authentication.get(), ADMIN_ROLES, HRADMIN_DASHBOARDS)
                        )

                        .requestMatchers(HttpMethod.GET,
                                "/api/teams",
                                "/api/teams/**"
                        ).access((authentication, context) ->
                                hasTeamPositionPermission(authentication.get(), "teamView")
                        )

                        .requestMatchers(HttpMethod.GET,
                                "/api/departments/comparison",
                                "/api/departments/*/comparison"
                        ).access((authentication, context) ->
                                hasDepartmentComparisonViewPermission(authentication.get())
                        )

                        .requestMatchers(
                                "/api/departments",
                                "/api/departments/**"
                        ).access((authentication, context) ->
                                hasHrPermissionOrNonHrRole(authentication.get(), "departmentCrud")
                        )

                        /*  .requestMatchers(
                                  "/api/employees",
                                  "/api/employees/**",
                                  "/api/hr/employee-accounts",
                                  "/api/hr/employee-accounts/**"
                          ).access((authentication, context) ->
                                  hasHrPermissionOrNonHrRole(authentication.get(), "employeeCrud")
                          )*/
                        .requestMatchers(HttpMethod.GET, "/api/employees")
                        .access((authentication, context) ->
                                hasHrDashboardOrNonHrRole(authentication.get())
                        )

                        .requestMatchers(
                                "/api/employees",
                                "/api/employees/**",
                                "/api/hr/employee-accounts",
                                "/api/hr/employee-accounts/**"
                        ).access((authentication, context) ->
                                hasHrPermissionOrNonHrRole(authentication.get(), "employeeCrud")
                        )

                        .requestMatchers(
                                "/api/appraisal-forms",
                                "/api/appraisal-forms/**",
                                "/api/assessment-forms",
                                "/api/assessment-forms/**"
                        ).access((authentication, context) ->
                                hasAnyRoleAndPositionPermission(
                                        authentication.get(),
                                        HR_ROLES,
                                        HR_DASHBOARDS,
                                        "assessmentFormCreate"
                                )
                        )

                        .requestMatchers(
                                "/api/self-assessment-score-table",
                                "/api/self-assessment-score-table/**"
                        ).access((authentication, context) ->
                                hasAnyRoleAndPositionPermission(
                                        authentication.get(),
                                        HR_ROLES,
                                        HR_DASHBOARDS,
                                        "assessmentScoresView"
                                )
                        )

                        .requestMatchers(
                                "/api/hr/appraisal/templates",
                                "/api/hr/appraisal/templates/**",
                                "/api/appraisal/templates",
                                "/api/appraisal/templates/**",
                                "/api/hr/appraisal/cycles",
                                "/api/hr/appraisal/cycles/**",
                                "/api/appraisal/cycles",
                                "/api/appraisal/cycles/**",
                                "/api/hr/appraisal/score-bands",
                                "/api/hr/appraisal/score-bands/**"
                        ).access((authentication, context) ->
                                hasAnyRoleAndPositionPermission(
                                        authentication.get(),
                                        HR_ROLES,
                                        HR_DASHBOARDS,
                                        "appraisalPermission"
                                )
                        )

                        /*
                         * Filled appraisal workflow (Manager -> Dept Head -> HR -> Employee).
                         * HR setup stays permission-controlled above; workflow endpoints are role-scoped
                         * with method-level @PreAuthorize on individual operations.
                         */
                        .requestMatchers(
                                "/api/appraisal/workflow",
                                "/api/appraisal/workflow/**"
                        ).access((authentication, context) ->
                                hasAppraisalWorkflowAccess(authentication.get())
                        )

                        .requestMatchers(
                                "/api/continuous-feedback",
                                "/api/continuous-feedback/**"
                        ).access((authentication, context) ->
                                hasContinuousFeedbackAccess(authentication.get())
                        )

                        /*
                         * HR 360 setup remains permission-controlled.
                         * Manager/DH/Employee feedback access is controlled by assignment/service rules.
                         */
                        .requestMatchers(
                                "/api/v1/feedback",
                                "/api/v1/feedback/**"
                        ).access((authentication, context) ->
                                hasHrPermissionOrNonHrRole(
                                        authentication.get(),
                                        "feedback360Permission"
                                )
                        )

                        .requestMatchers(
                                "/api/one-on-one-meetings",
                                "/api/one-on-one-meetings/**",
                                "/api/one-on-one-action-items",
                                "/api/one-on-one-action-items/**"
                        ).access((authentication, context) ->
                                hasOneOnOneApiAccess(authentication.get())
                        )

                        .requestMatchers(
                                "/api/pip",
                                "/api/pip/**",
                                "/api/pips",
                                "/api/pips/**",
                                "/api/pip-updates",
                                "/api/pip-updates/**"
                        ).access((authentication, context) ->
                                hasPipApiPermission(authentication.get())
                        )

                        .requestMatchers(
                                "/api/positions",
                                "/api/positions/**",
                                "/api/position-levels",
                                "/api/position-levels/**"
                        ).access((authentication, context) ->
                                hasAnyRoleAndPositionPermission(
                                        authentication.get(),
                                        HR_ROLES,
                                        HR_DASHBOARDS,
                                        "positionPermission"
                                )
                        )

                        .requestMatchers(
                                "/api/kpis",
                                "/api/kpis/**",
                                "/api/kpi-units",
                                "/api/kpi-units/**",
                                "/api/kpi-categories",
                                "/api/kpi-categories/**",
                                "/api/kpi-items",
                                "/api/kpi-items/**",
                                "/api/hr/kpi-templates",
                                "/api/hr/kpi-templates/**"
                        ).access((authentication, context) ->
                                hasAnyRoleAndPositionPermission(
                                        authentication.get(),
                                        HR_ROLES,
                                        HR_DASHBOARDS,
                                        "kpiPermission"
                                )
                        )

                        .requestMatchers(
                                "/api/hr/kpi-template-cycles",
                                "/api/hr/kpi-template-cycles/**",
                                "/api/hr/department-kpi-templates",
                                "/api/hr/department-kpi-templates/**",
                                "/api/hr/department-kpi-cycles",
                                "/api/hr/department-kpi-cycles/**",
                                "/api/hr/department-kpi-workflow",
                                "/api/hr/department-kpi-workflow/**"
                        ).access((authentication, context) ->
                                hasAnyRoleAndPositionPermission(
                                        authentication.get(),
                                        HR_ROLES,
                                        HR_DASHBOARDS,
                                        "departmentKpiPermission"
                                )
                        )

                        /*
                         * Default/common HR APIs that do not depend on sidebar permissions.
                         */
                        .requestMatchers(
                                "/api/dashboard",
                                "/api/dashboard/**",
                                "/api/announcements",
                                "/api/announcements/**",
                                "/api/notification-templates",
                                "/api/notification-templates/**"
                        ).access((authentication, context) ->
                                hasRoleDashboardOrPosition(authentication.get(), HR_ROLES, HR_DASHBOARDS)
                        )

                        .requestMatchers(
                                "/api/reports",
                                "/api/reports/**"
                        ).access((authentication, context) ->
                                hasRoleDashboardOrPosition(
                                        authentication.get(),
                                        Set.of(
                                                "HR",
                                                "HRADMIN",
                                                "MANAGER",
                                                "PROJECT_MANAGER",
                                                "TEAM_MANAGER",
                                                "DEPARTMENT_HEAD",
                                                "DEPARTMENTHEAD",
                                                "DEPT_HEAD",
                                                "HEAD_OF_DEPARTMENT",
                                                "CEO",
                                                "EXECUTIVE"
                                        ),
                                        Set.of(
                                                "HR_DASHBOARD",
                                                "HRADMIN_DASHBOARD",
                                                "MANAGER_DASHBOARD",
                                                "DEPARTMENT_HEAD_DASHBOARD",
                                                "DEPARTMENTHEAD_DASHBOARD",
                                                "DEPT_HEAD_DASHBOARD",
                                                "EXECUTIVE_DASHBOARD",
                                                "CEO_DASHBOARD"
                                        )
                                )
                        )

                        .requestMatchers(
                                "/api/kpi-workflow",
                                "/api/kpi-workflow/**",
                                "/api/manager/kpi-workflow",
                                "/api/manager/kpi-workflow/**"
                        ).access((authentication, context) ->
                                hasRoleDashboardOrPosition(authentication.get(), KPI_EVALUATOR_ROLES, KPI_EVALUATOR_DASHBOARDS)
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

                        .requestMatchers(HttpMethod.GET,
                                "/api/employee-assessments/template",
                                "/api/employee-assessments/me/current",
                                "/api/employee-assessments/my-latest-draft",
                                "/api/employee-assessments/me/latest-draft",
                                "/api/employee-assessments/my-scores",
                                "/api/employee-assessments/me/scores",
                                "/api/employee-assessments/my-history",
                                "/api/employee-assessments/me/history"
                        ).authenticated()

                        .requestMatchers(HttpMethod.POST, "/api/employee-assessments").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/employee-assessments/*").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/employee-assessments/*/submit").authenticated()

                        .requestMatchers(HttpMethod.GET, "/api/employee-assessments/score-table")
                        .access((authentication, context) ->
                                hasEmployeeAssessmentScoreTablePermission(authentication.get())
                        )

                        .requestMatchers(HttpMethod.GET, "/api/employee-assessments/*").authenticated()

                        .requestMatchers(HttpMethod.POST, "/api/employee-assessments/*/manager-remark")
                        .access((authentication, context) ->
                                hasRoleDashboardOrPosition(authentication.get(), MANAGER_ROLES, MANAGER_DASHBOARDS)
                        )

                        .requestMatchers(HttpMethod.POST, "/api/employee-assessments/*/manager-sign")
                        .access((authentication, context) ->
                                hasRoleDashboardOrPosition(authentication.get(), MANAGER_ROLES, MANAGER_DASHBOARDS)
                        )

                        .requestMatchers(HttpMethod.POST, "/api/employee-assessments/*/manager-decline")
                        .access((authentication, context) ->
                                hasRoleDashboardOrPosition(authentication.get(), MANAGER_ROLES, MANAGER_DASHBOARDS)
                        )

                        .requestMatchers(HttpMethod.POST, "/api/employee-assessments/*/department-head-sign")
                        .access((authentication, context) ->
                                hasRoleDashboardOrPosition(authentication.get(), DEPARTMENT_HEAD_ROLES, DEPARTMENT_HEAD_DASHBOARDS)
                        )

                        .requestMatchers(HttpMethod.POST, "/api/employee-assessments/*/hr-approve")
                        .access((authentication, context) ->
                                hasAnyRoleAndPositionPermission(
                                        authentication.get(),
                                        HR_ROLES,
                                        HR_DASHBOARDS,
                                        "assessmentScoresView"
                                )
                        )

                        .requestMatchers(HttpMethod.POST, "/api/employee-assessments/*/hr-decline")
                        .access((authentication, context) ->
                                hasAnyRoleAndPositionPermission(
                                        authentication.get(),
                                        HR_ROLES,
                                        HR_DASHBOARDS,
                                        "assessmentScoresView"
                                )
                        )

                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private AuthorizationDecision hasMyDepartmentTeamViewAccess(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return new AuthorizationDecision(false);
        }

        if (Boolean.TRUE.equals(hasRoleDashboardOrPosition(authentication, ADMIN_ROLES, HRADMIN_DASHBOARDS).isGranted())) {
            return new AuthorizationDecision(true);
        }

        /*
         * Department Head team view is a scoped department workspace feature.
         * TeamService.getMyDepartmentTeams() restricts the result to the current user's department.
         */
        if (Boolean.TRUE.equals(
                hasRoleDashboardOrPosition(authentication, DEPARTMENT_HEAD_ROLES, DEPARTMENT_HEAD_DASHBOARDS).isGranted()
        )) {
            return new AuthorizationDecision(true);
        }

        return new AuthorizationDecision(currentPositionHasPermission("teamView"));
    }

    private AuthorizationDecision hasTeamPositionPermission(Authentication authentication, String permissionField) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return new AuthorizationDecision(false);
        }

        if (Boolean.TRUE.equals(hasRoleDashboardOrPosition(authentication, ADMIN_ROLES, HRADMIN_DASHBOARDS).isGranted())) {
            return new AuthorizationDecision(true);
        }

        /*
         * HR owns the organization-wide team view workspace. HR can view teams and team history
         * even when a merged position-permission row is missing teamView/teamHistory.
         * Create/edit still remains Department Head permission-controlled.
         */
        if (("teamView".equals(permissionField) || "teamHistory".equals(permissionField))
                && Boolean.TRUE.equals(hasRoleDashboardOrPosition(authentication, HR_ROLES, HR_DASHBOARDS).isGranted())) {
            return new AuthorizationDecision(true);
        }

        return new AuthorizationDecision(currentPositionHasPermission(permissionField));
    }

    private boolean currentPositionHasPermission(String permissionField) {
        try {
            return positionPermissionService.currentUserHasPermission(permissionField);
        } catch (RuntimeException ignored) {
            return false;
        }
    }

    private AuthorizationDecision hasPipApiPermission(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return new AuthorizationDecision(false);
        }

        if (Boolean.TRUE.equals(isCurrentAuthenticationAdmin(authentication))) {
            return new AuthorizationDecision(true);
        }

        if (Boolean.TRUE.equals(isCurrentAuthenticationHr(authentication))) {
            return new AuthorizationDecision(true);
        }

        if (Boolean.TRUE.equals(isCurrentAuthenticationManager(authentication))
                || Boolean.TRUE.equals(isCurrentAuthenticationDepartmentHead(authentication))) {
            return new AuthorizationDecision(true);
        }

        /*
         * Employee own PIP visibility stays authenticated.
         * Service-level ownership checks still decide which records can be opened.
         */
        return new AuthorizationDecision(true);
    }

    private AuthorizationDecision hasAppraisalWorkflowAccess(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return new AuthorizationDecision(false);
        }

        if (Boolean.TRUE.equals(isCurrentAuthenticationAdmin(authentication))) {
            return new AuthorizationDecision(true);
        }

        if (Boolean.TRUE.equals(isCurrentAuthenticationHr(authentication))) {
            if (Boolean.TRUE.equals(
                    hasRoleDashboardOrPosition(authentication, MANAGER_ROLES, MANAGER_DASHBOARDS).isGranted()
            ) || Boolean.TRUE.equals(
                    hasRoleDashboardOrPosition(authentication, DEPARTMENT_HEAD_ROLES, DEPARTMENT_HEAD_DASHBOARDS).isGranted()
            )) {
                return new AuthorizationDecision(true);
            }

            return new AuthorizationDecision(currentPositionHasPermission("appraisalPermission"));
        }

        if (Boolean.TRUE.equals(
                hasRoleDashboardOrPosition(authentication, MANAGER_ROLES, MANAGER_DASHBOARDS).isGranted()
        )) {
            return new AuthorizationDecision(true);
        }

        if (Boolean.TRUE.equals(
                hasRoleDashboardOrPosition(authentication, DEPARTMENT_HEAD_ROLES, DEPARTMENT_HEAD_DASHBOARDS).isGranted()
        )) {
            return new AuthorizationDecision(true);
        }

        return new AuthorizationDecision(
                Boolean.TRUE.equals(
                        hasRoleDashboardOrPosition(
                                authentication,
                                Set.of("EMPLOYEE"),
                                Set.of("EMPLOYEE_DASHBOARD")
                        ).isGranted()
                )
        );
    }

    private AuthorizationDecision hasOneOnOneApiAccess(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return new AuthorizationDecision(false);
        }

        if (Boolean.TRUE.equals(isCurrentAuthenticationAdmin(authentication))) {
            return new AuthorizationDecision(true);
        }

        if (Boolean.TRUE.equals(isCurrentAuthenticationHr(authentication))) {
            return new AuthorizationDecision(currentPositionHasPermission("oneOnOnePermission"));
        }

        if (Boolean.TRUE.equals(isCurrentAuthenticationManager(authentication))
                || Boolean.TRUE.equals(isCurrentAuthenticationDepartmentHead(authentication))) {
            return new AuthorizationDecision(true);
        }

        return new AuthorizationDecision(currentPositionHasPermission("oneOnOnePermission"));
    }

    private AuthorizationDecision hasContinuousFeedbackAccess(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return new AuthorizationDecision(false);
        }

        if (Boolean.TRUE.equals(isCurrentAuthenticationAdmin(authentication))) {
            return new AuthorizationDecision(true);
        }

        if (Boolean.TRUE.equals(isCurrentAuthenticationHr(authentication))) {
            return new AuthorizationDecision(true);
        }

        if (Boolean.TRUE.equals(isCurrentAuthenticationManager(authentication))
                || Boolean.TRUE.equals(isCurrentAuthenticationDepartmentHead(authentication))) {
            return new AuthorizationDecision(true);
        }

        return new AuthorizationDecision(
                Boolean.TRUE.equals(
                        hasRoleDashboardOrPosition(
                                authentication,
                                Set.of("EMPLOYEE"),
                                Set.of("EMPLOYEE_DASHBOARD")
                        ).isGranted()
                )
        );
    }

    private AuthorizationDecision hasEmployeeAssessmentScoreTablePermission(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return new AuthorizationDecision(false);
        }

        if (Boolean.TRUE.equals(isCurrentAuthenticationAdmin(authentication))) {
            return new AuthorizationDecision(true);
        }

        if (Boolean.TRUE.equals(
                hasRoleDashboardOrPosition(authentication, SCORE_TABLE_ROLES, SCORE_TABLE_DASHBOARDS).isGranted()
        )) {
            return new AuthorizationDecision(true);
        }

        try {
            return new AuthorizationDecision(
                    positionPermissionService.currentUserHasPermission("assessmentScoresView")
            );
        } catch (RuntimeException ignored) {
            return new AuthorizationDecision(false);
        }
    }

    private AuthorizationDecision hasDepartmentComparisonViewPermission(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return new AuthorizationDecision(false);
        }

        if (Boolean.TRUE.equals(isCurrentAuthenticationAdmin(authentication))) {
            return new AuthorizationDecision(true);
        }

        if (Boolean.TRUE.equals(
                hasRoleDashboardOrPosition(authentication, HR_ROLES, HR_DASHBOARDS).isGranted()
        )) {
            return new AuthorizationDecision(true);
        }

        if (Boolean.TRUE.equals(
                hasRoleDashboardOrPosition(authentication, DEPARTMENT_HEAD_ROLES, DEPARTMENT_HEAD_DASHBOARDS).isGranted()
        )) {
            return new AuthorizationDecision(true);
        }

        if (Boolean.TRUE.equals(
                hasRoleDashboardOrPosition(authentication, EXECUTIVE_ROLES, EXECUTIVE_DASHBOARDS).isGranted()
        )) {
            return new AuthorizationDecision(true);
        }

        try {
            return new AuthorizationDecision(
                    positionPermissionService.currentUserHasPermission("departmentComparisonView")
            );
        } catch (RuntimeException ignored) {
            return new AuthorizationDecision(false);
        }
    }

    private AuthorizationDecision hasAnyRoleAndPositionPermission(
            Authentication authentication,
            Set<String> allowedRoles,
            Set<String> allowedDashboards,
            String permissionField
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return new AuthorizationDecision(false);
        }

        if (Boolean.TRUE.equals(isCurrentAuthenticationAdmin(authentication))) {
            return new AuthorizationDecision(true);
        }

        AuthorizationDecision roleDecision = hasRoleDashboardOrPosition(
                authentication,
                allowedRoles,
                allowedDashboards
        );

        if (!Boolean.TRUE.equals(roleDecision.isGranted())) {
            return new AuthorizationDecision(false);
        }

        return new AuthorizationDecision(
                positionPermissionService.currentUserHasPermission(permissionField)
        );
    }

    private AuthorizationDecision hasHrDashboardOrNonHrRole(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return new AuthorizationDecision(false);
        }

        if (Boolean.TRUE.equals(isCurrentAuthenticationAdmin(authentication))) {
            return new AuthorizationDecision(true);
        }

        if (Boolean.TRUE.equals(isCurrentAuthenticationHr(authentication))) {
            return hasRoleDashboardOrPosition(authentication, HR_ROLES, HR_DASHBOARDS);
        }

        return new AuthorizationDecision(true);
    }

    private AuthorizationDecision hasHrPermissionOrNonHrRole(
            Authentication authentication,
            String permissionField
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return new AuthorizationDecision(false);
        }

        if (Boolean.TRUE.equals(isCurrentAuthenticationAdmin(authentication))) {
            return new AuthorizationDecision(true);
        }

        if (Boolean.TRUE.equals(isCurrentAuthenticationHr(authentication))) {
            return new AuthorizationDecision(
                    positionPermissionService.currentUserHasPermission(permissionField)
            );
        }

        return new AuthorizationDecision(true);
    }

    private AuthorizationDecision hasPositionPermissionForAuthenticatedUser(
            Authentication authentication,
            String permissionField
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return new AuthorizationDecision(false);
        }

        Object principal = authentication.getPrincipal();

        if (principal == null || "anonymousUser".equals(principal)) {
            return new AuthorizationDecision(false);
        }

        if (Boolean.TRUE.equals(isCurrentAuthenticationAdmin(authentication))) {
            return new AuthorizationDecision(true);
        }

        return new AuthorizationDecision(
                positionPermissionService.currentUserHasPermission(permissionField)
        );
    }

    private boolean isCurrentAuthenticationAdmin(Authentication authentication) {
        return Boolean.TRUE.equals(
                hasRoleDashboardOrPosition(authentication, ADMIN_ROLES, HRADMIN_DASHBOARDS).isGranted()
        );
    }

    private boolean isCurrentAuthenticationManager(Authentication authentication) {
        return Boolean.TRUE.equals(
                hasRoleDashboardOrPosition(authentication, MANAGER_ROLES, MANAGER_DASHBOARDS).isGranted()
        );
    }

    private boolean isCurrentAuthenticationDepartmentHead(Authentication authentication) {
        return Boolean.TRUE.equals(
                hasRoleDashboardOrPosition(authentication, DEPARTMENT_HEAD_ROLES, DEPARTMENT_HEAD_DASHBOARDS).isGranted()
        );
    }

    private boolean isCurrentAuthenticationHr(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof UserPrincipal userPrincipal) {
            String dashboard = normalizeAuthorityName(userPrincipal.getDashboard());

            if ("HR_DASHBOARD".equals(dashboard)) {
                return true;
            }

            if (userPrincipal.getRoles() != null) {
                for (String role : userPrincipal.getRoles()) {
                    String normalizedRole = normalizeAuthorityName(role);

                    if (isHrLike(normalizedRole)) {
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

            if (isHrLike(normalizedAuthority)) {
                return true;
            }
        }

        return false;
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

            if (normalizedAllowedRoles.contains(normalizedPosition)
                    || normalizedAllowedDashboards.contains(normalizedPosition)) {
                return new AuthorizationDecision(true);
            }

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
                || normalizedValue.equals("HRADMIN")
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
                || normalizedValue.equals("DEPTHEAD")
                || normalizedValue.equals("HEAD_OF_DEPARTMENT")
                || normalizedValue.contains("DEPARTMENT_HEAD")
                || normalizedValue.contains("DEPARTMENTHEAD")
                || normalizedValue.contains("DEPT_HEAD")
                || normalizedValue.contains("DEPTHEAD")
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
