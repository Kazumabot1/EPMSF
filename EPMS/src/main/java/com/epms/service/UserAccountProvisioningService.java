package com.epms.service;

import com.epms.dto.AccountProvisionResult;
import com.epms.dto.EmailSendResult;
import com.epms.entity.Employee;
import com.epms.entity.Position;
import com.epms.entity.Role;
import com.epms.entity.User;
import com.epms.entity.UserRole;
import com.epms.repository.RoleRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.UserRoleRepository;
import com.epms.security.DashboardResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class UserAccountProvisioningService {

    private static final String SPAM_FOLDER_HINT = " If the inbox is empty, check Spam/Junk.";

    private static final Pattern EMAIL = Pattern.compile(
            "^[A-Za-z0-9+._-]+@[A-Za-z0-9._-]+\\.[A-Za-z]{2,}$"
    );

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final TemporaryPasswordService temporaryPasswordService;
    private final OnboardingEmailService onboardingEmailService;
    private final DashboardResolver dashboardResolver;

    /**
     * Existing compatibility method.
     */
    @Transactional
    public AccountProvisionResult provisionFromEmployee(
            Employee employee,
            String roleName,
            boolean sendTemporaryPasswordEmail
    ) {
        return provisionFromEmployee(employee, roleName, sendTemporaryPasswordEmail, null);
    }

    /**
     * Creates or links a user for the given employee, optionally emails a new temporary password,
     * and saves the selected dashboard into users.dashboard.
     */
    @Transactional
    public AccountProvisionResult provisionFromEmployee(
            Employee employee,
            String roleName,
            boolean sendTemporaryPasswordEmail,
            String requestedDashboard
    ) {
        if (employee.getEmail() == null || !isValidWorkEmail(employee.getEmail())) {
            return AccountProvisionResult.builder()
                    .success(false)
                    .message("A valid work email is required to create a login account.")
                    .smtpErrorDetail(null)
                    .build();
        }

        String email = employee.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        String normalizedRole = normalizeRoleName(roleName);
        String selectedDashboard = resolveDashboardForEmployee(employee.getPosition(), normalizedRole, requestedDashboard);

        if (user == null) {
            return createNewUser(
                    employee,
                    email,
                    normalizedRole,
                    selectedDashboard,
                    sendTemporaryPasswordEmail
            );
        }

        if (user.getEmployeeId() != null && !user.getEmployeeId().equals(employee.getId())) {
            return AccountProvisionResult.builder()
                    .userId(null)
                    .success(false)
                    .accountCreated(false)
                    .accountLinked(false)
                    .temporaryPasswordEmailSent(false)
                    .message("This email is already linked to another employee.")
                    .smtpErrorDetail(null)
                    .build();
        }

        user.setEmployeeId(employee.getId());
        user.setFullName(buildFullName(employee));
        user.setEmail(email);
        user.setPosition(employee.getPosition());
        user.setEmployeeCode(employee.getStaffNrc());
        user.setDashboard(selectedDashboard);
        user.setActive(employee.getActive() == null || Boolean.TRUE.equals(employee.getActive()));
        user.setUpdatedAt(new Date());

        user = userRepository.save(user);

        ensureRole(user, normalizedRole);

        if (sendTemporaryPasswordEmail) {
            return applyRotationAndEmail(
                    user,
                    "Temporary password has been sent. The employee must sign in and change it." + SPAM_FOLDER_HINT
            );
        }

        return AccountProvisionResult.builder()
                .userId(user.getId())
                .success(true)
                .accountCreated(false)
                .accountLinked(true)
                .temporaryPasswordEmailSent(false)
                .message("Login account is linked. Enable “send temporary password email” to email a new password.")
                .smtpErrorDetail(null)
                .build();
    }

    @Transactional
    public AccountProvisionResult resendTemporaryPassword(Integer userId) {
        User user = userRepository.findById(userId).orElseThrow();

        if (!isValidWorkEmail(user.getEmail())) {
            return AccountProvisionResult.builder()
                    .userId(user.getId())
                    .success(false)
                    .accountCreated(false)
                    .accountLinked(true)
                    .temporaryPasswordEmailSent(false)
                    .message("Cannot send temporary password because user email is missing or invalid.")
                    .smtpErrorDetail(null)
                    .build();
        }

        return applyRotationAndEmail(
                user,
                "Temporary password emailed. User must sign in and change it." + SPAM_FOLDER_HINT
        );
    }

    private AccountProvisionResult createNewUser(
            Employee employee,
            String email,
            String normalizedRole,
            String selectedDashboard,
            boolean sendTemporaryPasswordEmail
    ) {
        String temporaryPassword = temporaryPasswordService.generate();

        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(temporaryPassword));
        user.setFullName(buildFullName(employee));
        user.setEmployeeCode(employee.getStaffNrc());
        user.setEmployeeId(employee.getId());
        user.setPosition(employee.getPosition());
        user.setDashboard(selectedDashboard);
        user.setActive(true);
        user.setMustChangePassword(true);
        user.setAccountStatus("PENDING_PASSWORD_CHANGE");
        user.setCreatedAt(new Date());
        user.setUpdatedAt(new Date());

        user = userRepository.save(user);

        ensureRole(user, normalizedRole);

        String smtpError = null;
        boolean emailSent = false;

        if (sendTemporaryPasswordEmail) {
            EmailSendResult sendResult = onboardingEmailService.sendTemporaryPasswordEmail(
                    email,
                    user.getFullName(),
                    temporaryPassword
            );

            emailSent = sendResult.isSent();
            smtpError = sendResult.getSafeErrorDetail();

            if (emailSent) {
                user.setLastTemporaryPasswordSentAt(new Date());
                user.setUpdatedAt(new Date());
                userRepository.save(user);
            }
        }

        return AccountProvisionResult.builder()
                .userId(user.getId())
                .success(true)
                .accountCreated(true)
                .accountLinked(true)
                .temporaryPasswordEmailSent(emailSent)
                .smtpErrorDetail(smtpError)
                .message(
                        !sendTemporaryPasswordEmail
                                ? "Login account created. Temporary password was not emailed."
                                : (emailSent
                                ? "Login account created. Temporary password has been sent by email." + SPAM_FOLDER_HINT
                                : buildEmailFailureMessage("Login account was created, but the onboarding email could not be sent", smtpError))
                )
                .build();
    }

    private AccountProvisionResult applyRotationAndEmail(User user, String successWhenSent) {
        String temporaryPassword = temporaryPasswordService.generate();

        user.setPassword(passwordEncoder.encode(temporaryPassword));
        user.setMustChangePassword(true);
        user.setAccountStatus("PENDING_PASSWORD_CHANGE");
        user.setUpdatedAt(new Date());

        EmailSendResult sendResult = onboardingEmailService.sendTemporaryPasswordEmail(
                user.getEmail(),
                user.getFullName(),
                temporaryPassword
        );

        boolean emailSent = sendResult.isSent();
        String smtpError = sendResult.getSafeErrorDetail();

        if (emailSent) {
            user.setLastTemporaryPasswordSentAt(new Date());
        }

        userRepository.save(user);

        return AccountProvisionResult.builder()
                .userId(user.getId())
                .success(emailSent)
                .accountCreated(false)
                .accountLinked(true)
                .temporaryPasswordEmailSent(emailSent)
                .smtpErrorDetail(smtpError)
                .message(emailSent
                        ? successWhenSent
                        : buildEmailFailureMessage(
                        "Password was updated in the system, but the email could not be sent.",
                        smtpError
                ))
                .build();
    }

    public String resolveDashboardForEmployee(Position position, String roleName, String requestedDashboard) {
        String selectedDashboard = dashboardResolver.normalizeDashboard(requestedDashboard);

        if (selectedDashboard != null) {
            return selectedDashboard;
        }

        String resolvedRole = roleName;

        if ((resolvedRole == null || resolvedRole.isBlank())
                && position != null
                && position.getRole() != null
                && position.getRole().getName() != null) {
            resolvedRole = position.getRole().getName();
        }

        return dashboardResolver.resolveDashboard(List.of(normalizeRoleName(resolvedRole)));
    }

    public String normalizeRoleName(String roleName) {
        if (roleName == null || roleName.isBlank()) {
            return "EMPLOYEE";
        }

        String normalized = roleName
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("([a-z])([A-Z])", "$1_$2")
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase();

        return switch (normalized) {
            case "PROJECT_MANAGER", "PROJECTMANAGER", "TEAM_MANAGER", "PM" -> "MANAGER";
            case "DEPARTMENTHEAD", "DEPT_HEAD", "DEPTHEAD", "HEAD_OF_DEPARTMENT" -> "DEPARTMENT_HEAD";
            case "CEO", "EXECUTIVE" -> "CEO";
            case "ADMIN" -> "ADMIN";
            case "HR" -> "HR";
            case "MANAGER" -> "MANAGER";
            case "DEPARTMENT_HEAD" -> "DEPARTMENT_HEAD";
            case "EMPLOYEE" -> "EMPLOYEE";
            default -> "EMPLOYEE";
        };
    }

    public boolean isValidWorkEmail(String value) {
        if (value == null) {
            return false;
        }

        String text = value.trim();

        if (text.isEmpty() || text.length() > 254) {
            return false;
        }

        return EMAIL.matcher(text).matches();
    }

    private void ensureRole(User user, String roleName) {
        String normalizedRole = normalizeRoleName(roleName);

        Role role = roleRepository.findAll()
                .stream()
                .filter(item -> item.getName() != null && item.getName().equalsIgnoreCase(normalizedRole))
                .findFirst()
                .orElseGet(() -> {
                    Role newRole = new Role();
                    newRole.setName(normalizedRole);
                    newRole.setDescription("Auto-created during user provisioning");
                    return roleRepository.save(newRole);
                });

        if (!userRoleRepository.existsByUserIdAndRoleId(user.getId(), role.getId())) {
            UserRole userRole = new UserRole();
            userRole.setUserId(user.getId());
            userRole.setRoleId(role.getId());
            userRoleRepository.save(userRole);
        }
    }

    private String buildEmailFailureMessage(String prefix, String smtpError) {
        if (smtpError == null || smtpError.isBlank()) {
            return prefix + ". Check SMTP settings.";
        }

        return prefix + ". " + smtpError;
    }

    private String buildFullName(Employee employee) {
        if (employee == null) {
            return null;
        }

        String firstName = employee.getFirstName() == null ? "" : employee.getFirstName().trim();
        String lastName = employee.getLastName() == null ? "" : employee.getLastName().trim();
        String fullName = (firstName + " " + lastName).trim();

        return fullName.isBlank() ? null : fullName;
    }
}