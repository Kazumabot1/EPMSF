package com.epms.config;

import com.epms.entity.Department;
import com.epms.entity.Role;
import com.epms.entity.User;
import com.epms.entity.UserRole;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.RoleRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Date;

@Configuration
@Profile("local")
@RequiredArgsConstructor
public class LocalDemoDataSeeder {

    private static final String DEMO_PASSWORD = "123456789";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    ApplicationRunner seedLocalDemoUsers() {
        return args -> {
            Role hr = ensureRole("HR", "Local HR demo role");
            Role ceo = ensureRole("CEO", "Local CEO demo role");

            ensureUser("hr@epms.local", "Local HR", "HR_DASHBOARD", hr);
            ensureUser("ceo@epms.local", "Local CEO", "CEO_DASHBOARD", ceo);

            ensureDepartment("Human Resources", "HR");
            ensureDepartment("Finance", "FIN");
            ensureDepartment("Operations", "OPS");
        };
    }

    private Role ensureRole(String name, String description) {
        return roleRepository.findByNameIgnoreCase(name)
                .orElseGet(() -> {
                    Role role = new Role();
                    role.setName(name);
                    role.setDescription(description);
                    role.setActive(true);
                    role.setCreatedAt(new Date());
                    return roleRepository.save(role);
                });
    }

    private void ensureUser(String email, String fullName, String dashboard, Role role) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseGet(() -> {
                    User created = new User();
                    created.setEmail(email);
                    created.setPassword(passwordEncoder.encode(DEMO_PASSWORD));
                    created.setFullName(fullName);
                    created.setDashboard(dashboard);
                    created.setActive(true);
                    created.setAccountStatus("ACTIVE");
                    created.setMustChangePassword(false);
                    created.setCreatedAt(new Date());
                    return userRepository.save(created);
                });

        boolean changed = false;
        if (Boolean.FALSE.equals(user.getActive())) {
            user.setActive(true);
            changed = true;
        }
        if (user.getPassword() == null || !passwordEncoder.matches(DEMO_PASSWORD, user.getPassword())) {
            user.setPassword(passwordEncoder.encode(DEMO_PASSWORD));
            changed = true;
        }
        if (user.getDashboard() == null || !user.getDashboard().equals(dashboard)) {
            user.setDashboard(dashboard);
            changed = true;
        }
        if (Boolean.TRUE.equals(user.getMustChangePassword())) {
            user.setMustChangePassword(false);
            changed = true;
        }
        if (changed) {
            user.setUpdatedAt(new Date());
            user = userRepository.save(user);
        }

        if (!userRoleRepository.existsByUserIdAndRoleId(user.getId(), role.getId())) {
            UserRole userRole = new UserRole();
            userRole.setUserId(user.getId());
            userRole.setRoleId(role.getId());
            userRoleRepository.save(userRole);
        }
    }

    private void ensureDepartment(String name, String code) {
        Department department = departmentRepository.findByDepartmentNameIgnoreCase(name)
                .orElseGet(() -> {
                    Department created = new Department();
                    created.setDepartmentName(name);
                    created.setDepartmentCode(code);
                    created.setStatus(true);
                    created.setCreatedAt(new Date());
                    created.setCreatedBy("local-seeder");
                    return departmentRepository.save(created);
                });

        boolean changed = false;
        if (Boolean.FALSE.equals(department.getStatus())) {
            department.setStatus(true);
            changed = true;
        }
        if (department.getDepartmentCode() == null || department.getDepartmentCode().isBlank()) {
            department.setDepartmentCode(code);
            changed = true;
        }
        if (changed) {
            departmentRepository.save(department);
        }
    }
}
