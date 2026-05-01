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

        User user = userRepository.findActiveByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Active user not found with email: " + email));

        List<UserRole> userRoles = userRoleRepository.findByUserId(user.getId());
        List<Integer> roleIds = userRoles.stream().map(UserRole::getRoleId).distinct().toList();

        List<Role> roles = roleIds.isEmpty() ? List.of() : roleRepository.findAllById(roleIds);
        List<RolePermission> rolePermissions = roleIds.isEmpty() ? List.of()
                : rolePermissionRepository.findByRoleIdIn(roleIds);
        List<Integer> permissionIds = rolePermissions.stream().map(RolePermission::getPermissionId).distinct().toList();
        List<Permission> permissions = permissionIds.isEmpty() ? List.of()
                : permissionRepository.findAllById(permissionIds);

        Set<String> roleNames = new LinkedHashSet<>();
        roles.forEach(role -> roleNames.add(role.getName()));

        Set<String> permissionNames = new LinkedHashSet<>();
        permissions.forEach(permission -> permissionNames.add(permission.getName()));

        List<String> roleList = roleNames.stream().toList();
        List<String> permissionList = permissionNames.stream().toList();
        String dashboard = dashboardResolver.resolveDashboard(roleList,
                user.getPosition() != null ? user.getPosition().getPositionTitle() : null);

        return new UserPrincipal(user, roleList, permissionList, dashboard);
    }
}
