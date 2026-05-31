package com.epms.service;

import com.epms.entity.Employee;
import com.epms.entity.EmployeeCodeSequence;
import com.epms.entity.Position;
import com.epms.repository.EmployeeCodeSequenceRepository;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class EmployeeCodeGeneratorService {

    private static final int CODE_WIDTH = 4;

    private final EmployeeCodeSequenceRepository sequenceRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;

    @Transactional
    public String generateFor(Position position, String roleName, String dashboard) {
        String prefix = resolvePrefix(position, roleName, dashboard);

        EmployeeCodeSequence sequence = sequenceRepository.findByPrefixForUpdate(prefix)
                .orElseGet(() -> createSequence(prefix));

        int nextNumber = sequence.getNextNumber() == null || sequence.getNextNumber() < 1
                ? 1
                : sequence.getNextNumber();

        /*
         * Seed/import data can put employee_code values ahead of employee_code_sequence.next_number.
         * When that happens, the next HR employee create fails with a database 409 even when the
         * email is new. Generate inside the locked sequence row and skip every already-used code
         * from both employee and users so creation is deterministic and safe for HR and HR Admin.
         */
        String code = null;
        int guard = 0;
        while (guard < 10000) {
            String candidate = prefix + String.format(Locale.ROOT, "%0" + CODE_WIDTH + "d", nextNumber);
            if (!employeeRepository.existsByEmployeeCodeIgnoreCase(candidate)
                    && !userRepository.existsByEmployeeCodeIgnoreCase(candidate)) {
                code = candidate;
                break;
            }
            nextNumber++;
            guard++;
        }

        if (code == null) {
            throw new IllegalStateException("Unable to generate a unique employee code for prefix " + prefix + ".");
        }

        sequence.setNextNumber(nextNumber + 1);
        sequenceRepository.save(sequence);

        return code;
    }

    @Transactional
    public String ensureEmployeeCode(Employee employee, String roleName, String dashboard) {
        if (employee == null) {
            return generateFor(null, roleName, dashboard);
        }

        String existing = clean(employee.getEmployeeCode());
        if (existing != null) {
            employee.setEmployeeCode(existing);
            return existing;
        }

        String generated = generateFor(employee.getPosition(), roleName, dashboard);
        employee.setEmployeeCode(generated);
        return generated;
    }

    public String resolvePrefix(Position position, String roleName, String dashboard) {
        String role = normalize(firstNonBlank(
                roleName,
                position != null && position.getRole() != null ? position.getRole().getName() : null,
                dashboard
        ));

        String title = normalize(position != null ? position.getPositionTitle() : null);

        if (containsAny(role, "ADMIN") || containsAny(dashboard, "ADMIN")) {
            return "ADM";
        }
        if (containsAny(role, "HR", "HUMAN_RESOURCE", "HUMAN_RESOURCES") || containsAny(dashboard, "HR")) {
            return "HR";
        }
        if (containsAny(role, "CEO", "EXECUTIVE") || containsAny(dashboard, "CEO", "EXECUTIVE")) {
            return "EXE";
        }
        if (containsAny(role, "DEPARTMENT_HEAD", "DEPARTMENTHEAD", "DEPT_HEAD", "HEAD_OF_DEPARTMENT")
                || containsAny(title, "DEPARTMENT_HEAD", "DEPARTMENTHEAD", "DEPT_HEAD", "HEAD_OF_DEPARTMENT")) {
            return "DH";
        }
        if (containsAny(role, "PROJECT_MANAGER", "PROJECTMANAGER", "PM")
                || containsAny(title, "PROJECT_MANAGER", "PROJECTMANAGER", "PM")) {
            return "PM";
        }
        if (containsAny(role, "TEAM_LEADER", "TEAMLEADER", "TEAM_LEAD", "TEAMLEAD")
                || containsAny(title, "TEAM_LEADER", "TEAMLEADER", "TEAM_LEAD", "TEAMLEAD")) {
            return "TL";
        }
        if (containsAny(role, "MANAGER") || containsAny(title, "MANAGER")) {
            return "MGR";
        }

        return "EMP";
    }

    private EmployeeCodeSequence createSequence(String prefix) {
        EmployeeCodeSequence sequence = new EmployeeCodeSequence();
        sequence.setPrefix(prefix);
        sequence.setNextNumber(1);
        return sequenceRepository.saveAndFlush(sequence);
    }

    private boolean containsAny(String value, String... tokens) {
        String normalized = normalize(value);
        if (normalized == null) {
            return false;
        }

        for (String token : tokens) {
            String normalizedToken = normalize(token);
            if (normalizedToken != null && normalized.contains(normalizedToken)) {
                return true;
            }
        }

        return false;
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }

        for (String value : values) {
            String cleaned = clean(value);
            if (cleaned != null) {
                return cleaned;
            }
        }

        return null;
    }

    private String clean(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalize(String value) {
        String cleaned = clean(value);
        if (cleaned == null) {
            return null;
        }
        return cleaned
                .replaceFirst("(?i)^ROLE_", "")
                .replaceAll("([a-z])([A-Z])", "$1_$2")
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase(Locale.ROOT);
    }
}
