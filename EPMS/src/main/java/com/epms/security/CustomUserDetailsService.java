package com.epms.security;

import com.epms.entity.Permission;
import com.epms.entity.Role;
import com.epms.entity.RolePermission;
import com.epms.entity.User;
import com.epms.entity.UserRole;
import com.epms.repository.PermissionRepository;
import com.epms.repository.RolePermissionRepository;
import com.epms.repository.RoleRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final PermissionRepository permissionRepository;
    private final DashboardResolver dashboardResolver;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        String email = username == null ? "" : username.trim();

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        if (Boolean.FALSE.equals(user.getActive())) {
            throw new DisabledException("This account is inactive for now. Please contact the HR or Admin to verify!");
        }

        List<UserRole> userRoles = userRoleRepository.findByUserId(user.getId());

        List<Integer> roleIds = userRoles.stream()
                .map(UserRole::getRoleId)
                .distinct()
                .toList();

        List<Role> roles = roleIds.isEmpty()
                ? List.of()
                : roleRepository.findAllById(roleIds)
                .stream()
                .filter(role -> role.getActive() == null || Boolean.TRUE.equals(role.getActive()))
                .toList();

        List<Integer> activeRoleIds = roles.stream()
                .map(Role::getId)
                .distinct()
                .toList();

        List<RolePermission> rolePermissions = activeRoleIds.isEmpty()
                ? List.of()
                : rolePermissionRepository.findByRoleIdIn(activeRoleIds);

        List<Integer> permissionIds = rolePermissions.stream()
                .map(RolePermission::getPermissionId)
                .distinct()
                .toList();

        List<Permission> permissions = permissionIds.isEmpty()
                ? List.of()
                : permissionRepository.findAllById(permissionIds);

        Set<String> roleNames = new LinkedHashSet<>();
        String positionRoleName = null;

        if (user.getPosition() != null
                && user.getPosition().getRole() != null
                && user.getPosition().getRole().getName() != null
                && (user.getPosition().getRole().getActive() == null
                || Boolean.TRUE.equals(user.getPosition().getRole().getActive()))) {
            positionRoleName = normalizeRoleName(user.getPosition().getRole().getName());
            if (!positionRoleName.isBlank()) {
                roleNames.add(positionRoleName);
            }
        }

        roles.forEach(role -> {
            String normalized = normalizeRoleName(role.getName());

            if (!normalized.isBlank()) {
                roleNames.add(normalized);
            }
        });

        List<String> dashboardRoles = positionRoleName != null && !positionRoleName.isBlank()
                ? List.of(positionRoleName)
                : roleNames.stream().toList();

        /*
         * Position Role is the source of truth.
         * Do not let old users.dashboard override a newly selected Position Role.
         */
        String dashboard = dashboardResolver.resolveDashboard(dashboardRoles);

        if (positionRoleName == null || positionRoleName.isBlank()) {
            String selectedDashboard = dashboardResolver.normalizeDashboard(user.getDashboard());

            if (selectedDashboard != null) {
                dashboard = selectedDashboard;
            }
        }

        if (roleNames.isEmpty()) {
            roleNames.add(roleFromDashboard(dashboard));
        }

        Set<String> permissionNames = new LinkedHashSet<>();

        permissions.forEach(permission -> {
            if (permission.getName() != null && !permission.getName().isBlank()) {
                permissionNames.add(permission.getName());
            }
        });

        return new UserPrincipal(
                user,
                roleNames.stream().toList(),
                permissionNames.stream().toList(),
                dashboard
        );
    }

    private String roleFromDashboard(String dashboard) {
        if (dashboard == null || dashboard.isBlank()) {
            return "EMPLOYEE";
        }

        return switch (dashboard) {
            case "ADMIN_DASHBOARD" -> "ADMIN";
            case "HR_DASHBOARD" -> "HR";
            case "MANAGER_DASHBOARD" -> "MANAGER";
            case "DEPARTMENT_HEAD_DASHBOARD" -> "DEPARTMENT_HEAD";
            case "EXECUTIVE_DASHBOARD" -> "EXECUTIVE";
            case "EMPLOYEE_DASHBOARD" -> "EMPLOYEE";
            default -> "EMPLOYEE";
        };
    }

    private String normalizeRoleName(String role) {
        if (role == null) {
            return "";
        }

        String normalized = role
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("([a-z])([A-Z])", "$1_$2")
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase();

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
}