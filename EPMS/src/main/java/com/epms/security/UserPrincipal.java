package com.epms.security;

import com.epms.entity.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@Getter
public class UserPrincipal implements UserDetails {

    private final Integer id;
    private final String email;
    private final String password;
    private final boolean active;

    private final Integer managerId;
    private final Integer departmentId;

    private final String fullName;
    private final String employeeCode;
    private final String position;
    private final String dashboard;
    private final boolean mustChangePassword;

    private final List<String> roles;
    private final List<String> permissions;
    private final Collection<? extends GrantedAuthority> authorities;

    public UserPrincipal(User user, List<String> roles, List<String> permissions, String dashboard) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.password = user.getPassword();
        this.active = Boolean.TRUE.equals(user.getActive());
        this.managerId = user.getManagerId();
        this.departmentId = user.getDepartmentId();
        this.fullName = user.getFullName();
        this.employeeCode = user.getEmployeeCode();
        // Modified by KHN
        this.position = user.getPosition() != null ? user.getPosition().getPositionTitle() : null;
        // END HERE
        this.roles = roles;
        this.permissions = permissions;
        this.dashboard = dashboard;
        this.mustChangePassword = Boolean.TRUE.equals(user.getMustChangePassword());
        this.authorities = buildAuthorities(roles, permissions);
    }

    private Collection<? extends GrantedAuthority> buildAuthorities(List<String> roles, List<String> permissions) {
        List<SimpleGrantedAuthority> granted = new ArrayList<>();

        roles.forEach(role -> {
            String normalized = role.toUpperCase();
            if (!normalized.startsWith("ROLE_")) {
                normalized = "ROLE_" + normalized;
            }
            granted.add(new SimpleGrantedAuthority(normalized));
        });

        permissions.forEach(permission ->
                granted.add(new SimpleGrantedAuthority(permission.toUpperCase()))
        );

        return granted;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}