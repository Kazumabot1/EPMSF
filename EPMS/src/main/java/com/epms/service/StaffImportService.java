package com.epms.service;

import com.epms.entity.Department;
import com.epms.entity.Role;
import com.epms.entity.User;
import com.epms.entity.UserRole;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.RoleRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.UserRoleRepository;
import com.epms.dto.StaffImportRow;

import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class StaffImportService {

    private final DepartmentRepository departmentRepository;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;

    public StaffImportService(
            DepartmentRepository departmentRepository,
            RoleRepository roleRepository,
            UserRepository userRepository,
            UserRoleRepository userRoleRepository
    ) {
        this.departmentRepository = departmentRepository;
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
    }

    @Transactional
    public void importStaff(List<StaffImportRow> rows) {

        Map<String, Department> deptMap = departmentRepository.findAll().stream()
                .filter(d -> normalize(d.getDepartmentName()) != null)
                .collect(Collectors.toMap(
                        d -> normalize(d.getDepartmentName()),
                        Function.identity(),
                        (a, b) -> a
                ));

        Map<String, Role> roleMap = roleRepository.findAll().stream()
                .filter(r -> normalize(r.getName()) != null)
                .collect(Collectors.toMap(
                        r -> normalize(r.getName()),
                        Function.identity(),
                        (a, b) -> a
                ));

        Map<String, User> userByEmail = userRepository.findAll().stream()
                .filter(u -> normalize(u.getEmail()) != null)
                .collect(Collectors.toMap(
                        u -> normalize(u.getEmail()),
                        Function.identity(),
                        (a, b) -> a
                ));

        Map<String, User> userByEmployeeCode = userRepository.findAll().stream()
                .filter(u -> normalize(u.getEmployeeCode()) != null)
                .collect(Collectors.toMap(
                        u -> normalize(u.getEmployeeCode()),
                        Function.identity(),
                        (a, b) -> a
                ));

        Set<String> seen = new HashSet<>();

        for (StaffImportRow row : rows) {

            String employeeCode = normalize(row.getEmployeeCode());
            String fullName = normalize(row.getFullName());
            String email = normalizeEmail(row.getEmail());
            String departmentName = normalize(row.getDepartmentName());
            String position = normalize(row.getPosition());
            String roleName = normalize(row.getRoleName());

            if (employeeCode == null && email == null) {
                continue;
            }

            String dedupKey = (employeeCode != null ? employeeCode : "") + "|" + (email != null ? email : "");
            if (!seen.add(dedupKey)) {
                continue;
            }

            Department department = null;
            if (departmentName != null) {
                department = deptMap.computeIfAbsent(departmentName, name -> {
                    Department d = new Department();
                    d.setDepartmentName(name);
                    return departmentRepository.save(d);
                });
            }

            Role role = null;
            if (roleName != null) {
                role = roleMap.computeIfAbsent(roleName, name -> {
                    Role r = new Role();
                    r.setName(name);
                    r.setDescription("Auto-imported role");
                    return roleRepository.save(r);
                });
            }

            User user = null;

            if (employeeCode != null) {
                user = userByEmployeeCode.get(employeeCode);
            }

            if (user == null && email != null) {
                user = userByEmail.get(email);
            }

            if (user == null) {
                user = new User();
                user.setCreatedAt(new Date());
                user.setActive(true);
                user.setPassword("ChangeMe123!"); // change later if using encoder
            }

            if (fullName != null) {
                user.setFullName(fullName);
            }

            if (email != null) {
                user.setEmail(email);
            }

            if (employeeCode != null) {
                user.setEmployeeCode(employeeCode);
            }

            if (position != null) {
                user.setPosition(position);
            }

            if (department != null) {
                user.setDepartmentId(department.getId());
            }

            user.setUpdatedAt(new Date());

            user = userRepository.save(user);

            if (email != null) {
                userByEmail.put(email, user);
            }

            if (employeeCode != null) {
                userByEmployeeCode.put(employeeCode, user);
            }

            if (role != null && !userRoleRepository.existsByUserIdAndRoleId(user.getId(), role.getId())) {
                UserRole userRole = new UserRole();
                userRole.setUserId(user.getId());
                userRole.setRoleId(role.getId());
                userRoleRepository.save(userRole);
            }
        }
    }

    private String normalize(String value) {
        if (value == null) return null;

        String v = value.trim();
        if (v.isEmpty()) return null;

        String lower = v.toLowerCase();
        if (lower.equals("n/a")
                || lower.equals("na")
                || lower.equals("null")
                || lower.equals("xxx")
                || lower.equals("-")) {
            return null;
        }

        return v;
    }

    private String normalizeEmail(String value) {
        String v = normalize(value);
        return v == null ? null : v.toLowerCase(Locale.ROOT);
    }
}