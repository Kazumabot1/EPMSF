package com.epms.service.impl;

import com.epms.entity.User;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.UserRepository;
import com.epms.service.EmployeeHierarchyService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class EmployeeHierarchyServiceImpl implements EmployeeHierarchyService {

    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;

    public EmployeeHierarchyServiceImpl(
            UserRepository userRepository,
            EmployeeRepository employeeRepository
    ) {
        this.userRepository = userRepository;
        this.employeeRepository = employeeRepository;
    }

    /**
     * Returns manager employee id for the supplied employee id.
     * Source of truth is the synced login assignment:
     * employee.manager_id / users.manager_id stores manager USER id.
     */
    @Override
    @Transactional(readOnly = true)
    public Integer getManagerId(Integer employeeId) {
        if (employeeId == null) {
            return null;
        }

        User employeeUser = userRepository.findActiveByEmployeeId(employeeId).orElse(null);
        Integer managerUserId = employeeUser != null ? employeeUser.getManagerId() : null;

        if (managerUserId == null) {
            managerUserId = employeeRepository.findById(employeeId)
                    .map(employee -> employee.getManagerId())
                    .orElse(null);
        }

        if (managerUserId == null) {
            return null;
        }

        return userRepository.findById(managerUserId)
                .map(User::getEmployeeId)
                .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Integer> getRandomPeers(Integer employeeId, int count) {
        if (employeeId == null || count <= 0) {
            return Collections.emptyList();
        }

        User employeeUser = userRepository.findActiveByEmployeeId(employeeId).orElse(null);
        Integer departmentId = employeeUser != null ? employeeUser.getDepartmentId() : null;

        if (departmentId == null) {
            departmentId = employeeRepository.findById(employeeId)
                    .map(employee -> employee.getDepartmentId())
                    .orElse(null);
        }

        if (departmentId == null) {
            return Collections.emptyList();
        }

        return employeeRepository.findByDepartmentIdAndActiveTrue(departmentId)
                .stream()
                .filter(employee -> !Objects.equals(employee.getId(), employeeId))
                .map(employee -> employee.getId())
                .limit(count)
                .collect(Collectors.toCollection(ArrayList::new));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Integer> getSubordinates(Integer employeeId) {
        if (employeeId == null) {
            return Collections.emptyList();
        }

        User managerUser = userRepository.findActiveByEmployeeId(employeeId).orElse(null);

        if (managerUser == null || managerUser.getId() == null) {
            return Collections.emptyList();
        }

        return userRepository.findByManagerIdAndActiveTrue(managerUser.getId())
                .stream()
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(ArrayList::new));
    }
}
