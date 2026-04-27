package com.epms.service;

import com.epms.dto.AccountProvisionResult;
import com.epms.dto.EmailSendResult;
import com.epms.entity.Employee;
import com.epms.entity.Role;
import com.epms.entity.User;
import com.epms.entity.UserRole;
import com.epms.repository.RoleRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
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

    /**
     * Creates or links a user for the given employee, optionally emails a new temporary password.
     * Plain text password is only held in memory for the email and is never stored.
     */
    @Transactional
    public AccountProvisionResult provisionFromEmployee(
            Employee employee,
            String roleName,
            boolean sendTemporaryPasswordEmail
    ) {
        if (employee.getEmail() == null || !isValidWorkEmail(employee.getEmail())) {
            return AccountProvisionResult.builder()
                    .success(false)
                    .message("A valid work email is required to create a login account.")
                    .smtpErrorDetail(null)
                    .build();
        }

        String email = employee.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(email).orElse(null);
        String normalizedRole = roleName == null || roleName.isBlank() ? "EMPLOYEE" : roleName.trim().toUpperCase();

        if (user == null) {
            return createNewUser(employee, email, normalizedRole, sendTemporaryPasswordEmail);
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

        if (user.getEmployeeId() == null) {
            user.setEmployeeId(employee.getId());
            user.setFullName((employee.getFirstName() + " " + employee.getLastName()).trim());
            if (employee.getPosition() != null) {
                user.setPosition(employee.getPosition());
            }
            if (employee.getStaffNrc() != null) {
                user.setEmployeeCode(employee.getStaffNrc());
            }
            user.setUpdatedAt(new Date());
            user = userRepository.save(user);
        }

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
                .message("Login account is already linked. Enable “send temporary password email” to email a new password.")
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
            boolean sendTemporaryPasswordEmail
    ) {
        String temporaryPassword = temporaryPasswordService.generate();
        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(temporaryPassword));
        user.setFullName((employee.getFirstName() + " " + employee.getLastName()).trim());
        user.setEmployeeCode(employee.getStaffNrc());
        user.setEmployeeId(employee.getId());
        user.setPosition(employee.getPosition());
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

        boolean emailOk = !sendTemporaryPasswordEmail || emailSent;
        return AccountProvisionResult.builder()
                .userId(user.getId())
                .success(emailOk)
                .accountCreated(true)
                .accountLinked(true)
                .temporaryPasswordEmailSent(emailSent)
                .smtpErrorDetail(smtpError)
                .message(
                        !sendTemporaryPasswordEmail
                                ? "Login account created. Temporary password was not emailed (send disabled). Share credentials out-of-band if needed."
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
                .message(emailSent ? successWhenSent
                        : buildEmailFailureMessage(
                        "Password was updated in the system, but the email could not be sent (so the user may not know the new password).",
                        smtpError))
                .build();
    }

    private String buildEmailFailureMessage(String prefix, String smtpError) {
        if (smtpError == null || smtpError.isBlank()) {
            return prefix + ". Check SMTP settings.";
        }
        return prefix + ". " + smtpError;
    }

    public boolean isValidWorkEmail(String value) {
        if (value == null) {
            return false;
        }
        String t = value.trim();
        if (t.isEmpty() || t.length() > 254) {
            return false;
        }
        return EMAIL.matcher(t).matches();
    }

    private void ensureRole(User user, String roleName) {
        String normalizedRole = roleName == null || roleName.isBlank() ? "EMPLOYEE" : roleName.trim().toUpperCase();
        Role role = roleRepository.findAll()
                .stream()
                .filter(r -> r.getName().equalsIgnoreCase(normalizedRole))
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
}
