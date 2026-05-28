
package com.epms.service;

import com.epms.dto.AccountProvisionResult;
import com.epms.dto.HrEmployeeAccountCreateRequest;
import com.epms.dto.HrImportResult;
import com.epms.dto.HrImportRowResult;
import com.epms.entity.Department;
import com.epms.entity.Employee;
import com.epms.entity.EmployeeDepartment;
import com.epms.entity.Position;
import com.epms.entity.Role;
import com.epms.entity.User;
import com.epms.entity.UserRole;
import com.epms.exception.BadRequestException;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.EmployeeDepartmentRepository;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.PositionRepository;
import com.epms.repository.RoleRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.UserRoleRepository;
import jakarta.transaction.Transactional;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Service
public class HrEmployeeAccountService {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final PositionRepository positionRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeDepartmentRepository employeeDepartmentRepository;
    private final UserAccountProvisioningService userAccountProvisioningService;
    private final EmployeeCodeGeneratorService employeeCodeGeneratorService;

    public HrEmployeeAccountService(
            UserRepository userRepository,
            DepartmentRepository departmentRepository,
            PositionRepository positionRepository,
            RoleRepository roleRepository,
            UserRoleRepository userRoleRepository,
            EmployeeRepository employeeRepository,
            EmployeeDepartmentRepository employeeDepartmentRepository,
            UserAccountProvisioningService userAccountProvisioningService,
            EmployeeCodeGeneratorService employeeCodeGeneratorService
    ) {
        this.userRepository = userRepository;
        this.departmentRepository = departmentRepository;
        this.positionRepository = positionRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.employeeRepository = employeeRepository;
        this.employeeDepartmentRepository = employeeDepartmentRepository;
        this.userAccountProvisioningService = userAccountProvisioningService;
        this.employeeCodeGeneratorService = employeeCodeGeneratorService;
    }

    /**
     * Admin/HR account creation must keep these tables in sync:
     * users -> employee -> employee_department.
     *
     * Before this fix, Admin could create a login user without a matching employee master row
     * or without an active employee_department assignment. HR pages read employee data, so those
     * users looked "missing" even though they existed in users.
     */
    @Transactional
    public AccountProvisionResult createOrUpdateEmployeeAccount(HrEmployeeAccountCreateRequest request) {
        String email = cleanEmail(request.getEmail());
        String employeeCode = clean(request.getEmployeeCode());
        String fullName = clean(request.getFullName());
        if (email == null) {
            throw new BadRequestException("Email is required");
        }

        if (fullName == null) {
            fullName = joinName(clean(request.getFirstName()), clean(request.getLastName()));
        }

        if (fullName == null) {
            throw new BadRequestException("Full name is required");
        }

        Department department = findDepartment(request);
        Position position = findPosition(request);
        User manager = resolveManagerUser(request.getManagerId(), request.getEmployeeId());
        String normalizedRole = resolveRoleName(request.getRoleName(), position);

        Employee employee = findOrCreateEmployeeForAccount(request, email, fullName, employeeCode, position);
        employeeCode = ensureEmployeeCodeForAccount(employee, position, normalizedRole, employeeCode);
        employee.setDepartmentId(department == null ? null : department.getId());
        employee.setManagerId(manager == null ? null : manager.getId());
        employee.setActive(true);
        employee = employeeRepository.save(employee);

        syncEmployeeDepartment(employee, department, "Admin");

        AccountProvisionResult provision = userAccountProvisioningService.provisionFromEmployee(
                employee,
                normalizedRole,
                Boolean.TRUE.equals(request.getSendTemporaryPasswordEmail())
        );

        if (provision.getUserId() == null) {
            return provision;
        }

        User user = userRepository.findById(provision.getUserId())
                .orElseThrow(() -> new BadRequestException("User was created but could not be loaded"));

        user.setEmail(email);
        user.setEmployeeId(employee.getId());
        user.setEmployeeCode(employeeCode);
        user.setFullName(fullName);
        user.setDepartmentId(department == null ? null : department.getId());
        user.setManagerId(manager == null ? null : manager.getId());
        user.setPosition(position);
        user.setActive(true);
        user.setUpdatedAt(new Date());
        user = userRepository.save(user);

        replaceUserRole(user.getId(), normalizedRole, "Auto-created by Admin user management");

        return AccountProvisionResult.builder()
                .userId(user.getId())
                .success(provision.isSuccess())
                .accountCreated(provision.isAccountCreated())
                .accountLinked(provision.isAccountLinked())
                .temporaryPasswordEmailSent(provision.isTemporaryPasswordEmailSent())
                .message(provision.getMessage())
                .smtpErrorDetail(provision.getSmtpErrorDetail())
                .build();
    }

    /**
     * Used by Admin Dashboard edit. This intentionally updates both user login data and employee
     * master data so HR Employee, Manager, Department Head, and self-assessment pages all see the
     * same person.
     */
    @Transactional
    public User updateAdminUserAccount(
            Integer userId,
            String fullNameRaw,
            String emailRaw,
            String employeeCodeRaw,
            Integer departmentId,
            Integer positionId,
            Integer managerId,
            String roleNameRaw,
            Boolean activeRaw
    ) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found"));

        String email = cleanEmail(emailRaw);
        String fullName = clean(fullNameRaw);
        String employeeCode = clean(employeeCodeRaw);
        boolean active = activeRaw == null || activeRaw;

        if (email == null) {
            throw new BadRequestException("Email is required");
        }

        if (fullName == null) {
            throw new BadRequestException("Full name is required");
        }

        userRepository.findByEmailIgnoreCase(email).ifPresent(existing -> {
            if (!existing.getId().equals(userId)) {
                throw new BadRequestException("Email is already used by another user");
            }
        });

        Department department = null;
        if (departmentId != null) {
            department = departmentRepository.findById(departmentId)
                    .orElseThrow(() -> new BadRequestException("Department not found"));
        }

        Position position = null;
        if (positionId != null) {
            position = positionRepository.findById(positionId)
                    .orElseThrow(() -> new BadRequestException("Position not found"));
        }
        User manager = resolveManagerUser(managerId, user.getEmployeeId());
        String normalizedRole = resolveRoleName(roleNameRaw, position);

        Employee employee = findOrCreateEmployeeForUser(user, email, fullName, employeeCode, position);
        employeeCode = ensureEmployeeCodeForAccount(employee, position, normalizedRole, employeeCode);
        employee.setDepartmentId(department == null ? null : department.getId());
        employee.setManagerId(manager == null ? null : manager.getId());
        employee.setActive(active);
        employee = employeeRepository.save(employee);

        if (active) {
            syncEmployeeDepartment(employee, department, "Admin");
        } else {
            closeActiveEmployeeDepartmentAssignments(employee);
        }

        user.setEmail(email);
        user.setFullName(fullName);
        user.setEmployeeCode(employeeCode);
        user.setEmployeeId(employee.getId());
        user.setDepartmentId(department == null ? null : department.getId());
        user.setManagerId(manager == null ? null : manager.getId());
        user.setPosition(position);
        user.setActive(active);
        user.setUpdatedAt(new Date());
        user = userRepository.save(user);

        replaceUserRole(user.getId(), normalizedRole, "Auto-created by Admin user edit");

        return user;
    }

    @Transactional
    public HrImportResult importEmployeeAccounts(MultipartFile file) throws Exception {
        HrImportResult result = new HrImportResult();

        List<Map<String, String>> rows;
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);

        if (filename.endsWith(".xlsx")) {
            rows = readXlsx(file);
        } else {
            rows = readCsv(file);
        }

        int rowNumber = 1;

        for (Map<String, String> row : rows) {
            rowNumber++;

            String email = value(row, "EmailAddress", "Email", "email");
            String staffNo = value(row, "StaffNo", "EmployeeCode", "employeeCode");
            String staffName = value(row, "StaffName", "FullName", "fullName");
            String department = value(row, "Department", "departmentName");
            String position = value(row, "Position", "positionName");
            String firstName = value(row, "FirstName", "firstName");
            String lastName = value(row, "LastName", "lastName");
            String roleName = value(
                    row,
                    "Role",
                    "RoleName",
                    "role",
                    "roleName",
                    "UserRole",
                    "userRole",
                    "AccountRole",
                    "accountRole"
            );

            HrImportRowResult rowResult = HrImportRowResult.builder()
                    .rowNumber(rowNumber)
                    .email(cleanEmail(email))
                    .build();

            if (clean(email) == null) {
                result.setSkipped(result.getSkipped() + 1);
                result.getWarnings().add("Row " + rowNumber + ": skipped because email is empty");
                rowResult.setEmployeeAction("skipped");
                rowResult.setAccountAction("skipped");
                rowResult.setEmailAction("skipped");
                rowResult.getValidationErrors().add("Email is required");
                result.getRows().add(rowResult);
                continue;
            }

            boolean existed = userRepository.findByEmailIgnoreCase(cleanEmail(email)).isPresent();

            HrEmployeeAccountCreateRequest request = new HrEmployeeAccountCreateRequest();
            request.setEmployeeCode(staffNo);
            request.setFullName(staffName);
            request.setEmail(email);
            request.setDepartmentName(department);
            request.setPositionName(position);
            request.setRoleName(roleName);
            request.setFirstName(firstName);
            request.setLastName(lastName);
            request.setSendTemporaryPasswordEmail(true);

            AccountProvisionResult provision = createOrUpdateEmployeeAccount(request);

            if (existed) {
                result.setUpdated(result.getUpdated() + 1);
                rowResult.setAccountAction("linked");
            } else {
                result.setCreated(result.getCreated() + 1);
                rowResult.setAccountAction("created");
            }

            rowResult.setEmployeeAction("created_or_updated");
            rowResult.setEmailAction(provision.isTemporaryPasswordEmailSent() ? "sent" : "failed");

            if (!provision.isSuccess() && provision.getMessage() != null) {
                rowResult.getValidationErrors().add(provision.getMessage());
            }

            result.getRows().add(rowResult);
        }

        return result;
    }

    @Transactional
    public AccountProvisionResult resendTemporaryPassword(Integer userId) {
        return userAccountProvisioningService.resendTemporaryPassword(userId);
    }

    /**
     * One-time/manual repair for old data created before the sync rule existed.
     *
     * It makes every login user with a valid email have a matching employee master row,
     * links users.employee_id to employee.id, copies core fields both ways, and syncs
     * employee_department from users.department_id.
     */
    @Transactional
    public int resyncAllUserEmployeeLinks() {
        int synced = 0;

        for (User user : userRepository.findAll()) {
            String email = cleanEmail(user.getEmail());

            if (email == null) {
                continue;
            }

            String fullName = clean(user.getFullName());

            if (fullName == null) {
                fullName = email.substring(0, email.indexOf('@'));
            }

            String employeeCode = clean(user.getEmployeeCode());
            Position position = user.getPosition();

            Department department = null;

            if (user.getDepartmentId() != null) {
                department = departmentRepository.findById(user.getDepartmentId()).orElse(null);
            }

            Employee employee = findOrCreateEmployeeForUser(user, email, fullName, employeeCode, position);
            employeeCode = ensureEmployeeCodeForAccount(employee, position, resolveRoleName(null, position), employeeCode);
            Integer managerId = user.getManagerId() != null ? user.getManagerId() : employee.getManagerId();
            employee.setDepartmentId(department == null ? employee.getDepartmentId() : department.getId());
            employee.setManagerId(managerId);
            employee.setActive(user.getActive() == null || user.getActive());
            employee = employeeRepository.save(employee);

            if (employee.getActive() == null || employee.getActive()) {
                syncEmployeeDepartment(employee, department, "System Resync");
            } else {
                closeActiveEmployeeDepartmentAssignments(employee);
            }

            user.setEmail(email);
            user.setFullName(fullName);
            user.setEmployeeCode(employeeCode);
            user.setEmployeeId(employee.getId());
            user.setDepartmentId(employee.getDepartmentId());
            user.setManagerId(employee.getManagerId());
            user.setPosition(position != null ? position : employee.getPosition());
            user.setActive(user.getActive() == null || user.getActive());
            user.setUpdatedAt(new Date());

            userRepository.save(user);
            synced++;
        }

        return synced;
    }

    private String ensureEmployeeCodeForAccount(
            Employee employee,
            Position position,
            String roleName,
            String requestedEmployeeCode
    ) {
        String requested = clean(requestedEmployeeCode);

        if (requested != null) {
            employee.setEmployeeCode(requested);
            return requested;
        }

        if (employee.getPosition() == null && position != null) {
            employee.setPosition(position);
        }

        String dashboard = userAccountProvisioningService.resolveDashboardForEmployee(
                employee.getPosition(),
                roleName,
                null
        );

        return employeeCodeGeneratorService.ensureEmployeeCode(employee, roleName, dashboard);
    }

    private User resolveManagerUser(Integer managerId, Integer employeeIdBeingEdited) {
        if (managerId == null) {
            return null;
        }

        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new BadRequestException("Assigned manager not found"));

        if (manager.getActive() != null && !manager.getActive()) {
            throw new BadRequestException("Assigned manager is inactive");
        }

        if (employeeIdBeingEdited != null && Objects.equals(manager.getEmployeeId(), employeeIdBeingEdited)) {
            throw new BadRequestException("A user cannot be assigned as their own manager");
        }

        return manager;
    }

    private Department findDepartment(HrEmployeeAccountCreateRequest request) {
        if (request.getDepartmentId() != null) {
            return departmentRepository.findById(request.getDepartmentId())
                    .orElseThrow(() -> new BadRequestException("Department not found"));
        }

        return getOrCreateDepartment(request.getDepartmentName());
    }

    private Position findPosition(HrEmployeeAccountCreateRequest request) {
        if (request.getPositionId() != null) {
            return positionRepository.findById(request.getPositionId())
                    .orElseThrow(() -> new BadRequestException("Position not found"));
        }

        return findPosition(request.getPositionName());
    }

    private Department getOrCreateDepartment(String name) {
        String departmentName = clean(name);

        if (departmentName == null) {
            return null;
        }

        return departmentRepository.findByDepartmentNameIgnoreCase(departmentName)
                .orElseGet(() -> {
                    Department department = new Department();
                    department.setDepartmentName(departmentName);
                    department.setStatus(true);
                    department.setCreatedAt(new Date());
                    department.setCreatedBy("Admin/HR Import");
                    return departmentRepository.save(department);
                });
    }

    private Position findPosition(String name) {
        String positionName = clean(name);

        if (positionName == null) {
            return null;
        }

        return positionRepository.findByPositionTitleIgnoreCase(positionName)
                .orElse(null);
    }

    private Employee findOrCreateEmployeeForAccount(
            HrEmployeeAccountCreateRequest request,
            String email,
            String fullName,
            String employeeCode,
            Position position
    ) {
        Employee employee = null;

        if (request.getEmployeeId() != null) {
            employee = employeeRepository.findById(request.getEmployeeId()).orElse(null);
        }

        if (employee == null) {
            employee = findEmployeeByEmailIgnoreCase(email).orElse(null);
        }

        if (employee == null) {
            employee = new Employee();
        }

        syncEmployeeBasicFields(employee, email, fullName, employeeCode, position);

        return employee;
    }

    private Employee findOrCreateEmployeeForUser(
            User user,
            String email,
            String fullName,
            String employeeCode,
            Position position
    ) {
        Employee employee = null;

        if (user.getEmployeeId() != null) {
            employee = employeeRepository.findById(user.getEmployeeId()).orElse(null);
        }

        if (employee == null) {
            employee = findEmployeeByEmailIgnoreCase(email).orElse(null);
        }

        if (employee == null) {
            employee = new Employee();
        }

        syncEmployeeBasicFields(employee, email, fullName, employeeCode, position);

        return employee;
    }

    private void syncEmployeeBasicFields(
            Employee employee,
            String email,
            String fullName,
            String employeeCode,
            Position position
    ) {
        employee.setEmail(email);
        employee.setFirstName(deriveFirstName(fullName));
        employee.setLastName(deriveLastName(fullName));
        if (employeeCode != null) {
            employee.setEmployeeCode(employeeCode);
        }
        employee.setPosition(position);
    }

    private void syncEmployeeDepartment(Employee employee, Department department, String assignBy) {
        if (employee == null || employee.getId() == null) {
            return;
        }

        if (department == null) {
            employee.setDepartmentId(null);
            closeActiveEmployeeDepartmentAssignments(employee);
            employeeRepository.save(employee);
            return;
        }

        employee.setDepartmentId(department.getId());

        List<EmployeeDepartment> activeAssignments = employeeDepartmentRepository
                .findActiveAssignmentsForEmployeeId(employee.getId());

        for (EmployeeDepartment assignment : activeAssignments) {
            Integer currentDepartmentId = assignment.getCurrentDepartment() == null
                    ? null
                    : assignment.getCurrentDepartment().getId();
            Integer parentDepartmentId = assignment.getParentDepartment() == null
                    ? null
                    : assignment.getParentDepartment().getId();
            Integer workingDepartmentId = parentDepartmentId != null ? parentDepartmentId : currentDepartmentId;

            if (Objects.equals(workingDepartmentId, department.getId())) {
                assignment.setCurrentDepartment(department);
                assignment.setParentDepartment(null);
                assignment.setAssignBy(assignBy == null ? "Admin" : assignBy);
                if (assignment.getStartdate() == null) {
                    assignment.setStartdate(new Date());
                }
                assignment.setEnddate(null);
                employeeDepartmentRepository.save(assignment);
                employeeRepository.save(employee);
                return;
            }
        }

        closeActiveEmployeeDepartmentAssignments(employee);

        EmployeeDepartment newAssignment = new EmployeeDepartment();
        newAssignment.setEmployee(employee);
        newAssignment.setCurrentDepartment(department);
        newAssignment.setParentDepartment(null);
        newAssignment.setAssignBy(assignBy == null ? "Admin" : assignBy);
        newAssignment.setStartdate(new Date());
        newAssignment.setEnddate(null);

        employeeDepartmentRepository.save(newAssignment);
        employeeRepository.save(employee);
    }

    private void closeActiveEmployeeDepartmentAssignments(Employee employee) {
        if (employee == null || employee.getId() == null) {
            return;
        }

        List<EmployeeDepartment> activeAssignments = employeeDepartmentRepository
                .findActiveAssignmentsForEmployeeId(employee.getId());

        Date endDate = new Date();

        for (EmployeeDepartment assignment : activeAssignments) {
            assignment.setEnddate(endDate);
            employeeDepartmentRepository.save(assignment);
        }
    }

    private Optional<Employee> findEmployeeByEmailIgnoreCase(String email) {
        String normalizedEmail = cleanEmail(email);

        if (normalizedEmail == null) {
            return Optional.empty();
        }

        Optional<Employee> exact = employeeRepository.findByEmail(normalizedEmail);

        if (exact.isPresent()) {
            return exact;
        }

        return employeeRepository.findAll()
                .stream()
                .filter(employee -> employee.getEmail() != null)
                .filter(employee -> employee.getEmail().trim().equalsIgnoreCase(normalizedEmail))
                .findFirst();
    }

    private void replaceUserRole(Integer userId, String roleName, String description) {
        if (userId == null) {
            return;
        }

        Role role = getOrCreateRole(roleName, description);
        List<UserRole> existingRoles = userRoleRepository.findByUserId(userId);

        if (!existingRoles.isEmpty()) {
            userRoleRepository.deleteAll(existingRoles);
        }

        UserRole userRole = new UserRole();
        userRole.setUserId(userId);
        userRole.setRoleId(role.getId());

        userRoleRepository.save(userRole);
    }

    private Role getOrCreateRole(String name, String description) {
        String roleName = normalizeRoleName(name);

        return roleRepository.findByNameIgnoreCase(roleName)
                .orElseGet(() -> {
                    Role role = new Role();
                    role.setName(roleName);
                    role.setDescription(description == null ? "Auto-created during user provisioning" : description);
                    return roleRepository.save(role);
                });
    }

    private String resolveRoleName(String requestedRoleName, Position position) {
        if (position != null && position.getRole() != null && position.getRole().getName() != null) {
            return normalizeRoleName(position.getRole().getName());
        }

        return normalizeRoleName(requestedRoleName);
    }

    private String normalizeRoleName(String roleName) {
        String value = clean(roleName);

        if (value == null) {
            return "EMPLOYEE";
        }

        String normalized = value
                .replaceFirst("(?i)^ROLE_", "")
                .replaceAll("([a-z])([A-Z])", "$1_$2")
                .replaceAll("[\\s/-]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase(Locale.ROOT);

        return switch (normalized) {
            case "PROJECT_MANAGER", "PROJECTMANAGER", "TEAM_MANAGER", "PM" -> "MANAGER";
            case "DEPARTMENTHEAD", "DEPT_HEAD", "HEAD_OF_DEPARTMENT" -> "DEPARTMENT_HEAD";
            case "EXECUTIVE", "CEO" -> "CEO";
            case "ADMIN" -> "ADMIN";
            case "HR" -> "HR";
            case "MANAGER" -> "MANAGER";
            case "DEPARTMENT_HEAD" -> "DEPARTMENT_HEAD";
            case "EMPLOYEE" -> "EMPLOYEE";
            default -> "EMPLOYEE";
        };
    }

    private String deriveFirstName(String fullName) {
        String value = clean(fullName);

        if (value == null) {
            return "Employee";
        }

        String[] parts = value.split("\\s+");
        return parts.length > 0 ? parts[0] : "Employee";
    }

    private String deriveLastName(String fullName) {
        String value = clean(fullName);

        if (value == null) {
            return "User";
        }

        String[] parts = value.split("\\s+");
        return parts.length > 1 ? parts[parts.length - 1] : "User";
    }

    private String joinName(String firstName, String lastName) {
        String joined = ((firstName == null ? "" : firstName.trim()) + " " + (lastName == null ? "" : lastName.trim())).trim();
        return joined.isBlank() ? null : joined;
    }

    private List<Map<String, String>> readCsv(MultipartFile file) throws Exception {
        List<Map<String, String>> rows = new ArrayList<>();

        BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream())
        );

        String headerLine = reader.readLine();

        if (headerLine == null) {
            return rows;
        }

        headerLine = headerLine.replace("\uFEFF", "");
        List<String> headers = parseCsvLine(headerLine);

        String line;

        while ((line = reader.readLine()) != null) {
            List<String> values = parseCsvLine(line);
            Map<String, String> row = new HashMap<>();

            for (int i = 0; i < headers.size(); i++) {
                String value = i < values.size() ? values.get(i) : "";
                row.put(headers.get(i).trim(), value);
            }

            rows.add(row);
        }

        return rows;
    }

    private List<Map<String, String>> readXlsx(MultipartFile file) throws Exception {
        List<Map<String, String>> rows = new ArrayList<>();

        Workbook workbook = WorkbookFactory.create(file.getInputStream());
        Sheet sheet = workbook.getSheetAt(0);

        Row headerRow = sheet.getRow(0);

        if (headerRow == null) {
            workbook.close();
            return rows;
        }

        List<String> headers = new ArrayList<>();
        DataFormatter formatter = new DataFormatter();

        for (Cell cell : headerRow) {
            headers.add(formatter.formatCellValue(cell).trim());
        }

        for (int i = 1; i <= sheet.getLastRowNum(); i++) {
            Row excelRow = sheet.getRow(i);

            if (excelRow == null) {
                continue;
            }

            Map<String, String> row = new HashMap<>();

            for (int j = 0; j < headers.size(); j++) {
                Cell cell = excelRow.getCell(j);
                row.put(headers.get(j), cell == null ? "" : formatter.formatCellValue(cell));
            }

            rows.add(row);
        }

        workbook.close();
        return rows;
    }

    private List<String> parseCsvLine(String line) {
        List<String> result = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean insideQuote = false;

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);

            if (c == '"') {
                insideQuote = !insideQuote;
            } else if (c == ',' && !insideQuote) {
                result.add(current.toString());
                current.setLength(0);
            } else {
                current.append(c);
            }
        }

        result.add(current.toString());
        return result;
    }

    private String value(Map<String, String> row, String... keys) {
        for (String key : keys) {
            if (row.containsKey(key)) {
                return row.get(key);
            }
        }

        return null;
    }

    private String clean(String value) {
        if (value == null) {
            return null;
        }

        String cleaned = value.trim();

        if (cleaned.isEmpty()
                || cleaned.equalsIgnoreCase("null")
                || cleaned.equalsIgnoreCase("nil")
                || cleaned.equalsIgnoreCase("n/a")
                || cleaned.equalsIgnoreCase("xxx")
                || cleaned.equals("-")) {
            return null;
        }

        return cleaned;
    }

    private String cleanEmail(String email) {
        String value = clean(email);
        return value == null ? null : value.toLowerCase(Locale.ROOT);
    }
}
