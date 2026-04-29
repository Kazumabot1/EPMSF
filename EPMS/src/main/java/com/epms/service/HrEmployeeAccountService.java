package com.epms.service;

import com.epms.dto.HrEmployeeAccountCreateRequest;
import com.epms.dto.HrImportResult;
import com.epms.dto.HrImportRowResult;
import com.epms.dto.AccountProvisionResult;
import com.epms.entity.*;
import com.epms.exception.BadRequestException;
import com.epms.repository.*;
import jakarta.transaction.Transactional;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.util.*;

@Service
public class HrEmployeeAccountService {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final PositionRepository positionRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final EmployeeRepository employeeRepository;
    private final UserAccountProvisioningService userAccountProvisioningService;

    public HrEmployeeAccountService(
            UserRepository userRepository,
            DepartmentRepository departmentRepository,
            PositionRepository positionRepository,
            RoleRepository roleRepository,
            UserRoleRepository userRoleRepository,
            EmployeeRepository employeeRepository,
            UserAccountProvisioningService userAccountProvisioningService
    ) {
        this.userRepository = userRepository;
        this.departmentRepository = departmentRepository;
        this.positionRepository = positionRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.employeeRepository = employeeRepository;
        this.userAccountProvisioningService = userAccountProvisioningService;
    }
    private Department findDepartment(HrEmployeeAccountCreateRequest request) {
        if (request.getDepartmentId() != null) {
            return departmentRepository.findById(request.getDepartmentId())
                    .orElse(null);
        }

        return getOrCreateDepartment(request.getDepartmentName());
    }

    private Position findPosition(HrEmployeeAccountCreateRequest request) {
        if (request.getPositionId() != null) {
            return positionRepository.findById(request.getPositionId())
                    .orElse(null);
        }

        return findPosition(request.getPositionName());
    }

    @Transactional
    public AccountProvisionResult createOrUpdateEmployeeAccount(HrEmployeeAccountCreateRequest request) {
        String email = cleanEmail(request.getEmail());
        String employeeCode = clean(request.getEmployeeCode());

        if (email == null) {
            throw new BadRequestException("Email is required");
        }

        Employee employee = findOrCreateEmployeeForAccount(request);
        AccountProvisionResult provision = userAccountProvisioningService.provisionFromEmployee(
                employee,
                clean(request.getRoleName()) != null ? request.getRoleName() : "EMPLOYEE",
                Boolean.TRUE.equals(request.getSendTemporaryPasswordEmail())
        );
        if (!provision.isSuccess() || provision.getUserId() == null) {
            return provision;
        }
        User user = userRepository.findById(provision.getUserId()).orElseThrow();
        user.setEmail(email);
        user.setEmployeeCode(employeeCode);
        user.setFullName(clean(request.getFullName()));
        user.setUpdatedAt(new Date());

        Department department = findDepartment(request);
        if (department != null) {
            user.setDepartmentId(department.getId());
        }

        Position position = findPosition(request);
        if (position != null) {
            user.setPosition(position);
        }

        user = userRepository.save(user);

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

    @Transactional
    public HrImportResult importEmployeeAccounts(MultipartFile file) throws Exception {
        HrImportResult result = new HrImportResult();

        List<Map<String, String>> rows;
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();

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

            boolean existed = userRepository.findByEmail(cleanEmail(email)).isPresent();

            HrEmployeeAccountCreateRequest request = new HrEmployeeAccountCreateRequest();
            request.setEmployeeCode(staffNo);
            request.setFullName(staffName);
            request.setEmail(email);
            request.setDepartmentName(department);
            request.setPositionName(position);
            request.setRoleName("EMPLOYEE");
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

    private Department getOrCreateDepartment(String name) {
        String departmentName = clean(name);
        if (departmentName == null) return null;

        return departmentRepository.findByDepartmentName(departmentName)
                .orElseGet(() -> {
                    Department d = new Department();
                    d.setDepartmentName(departmentName);
                    d.setStatus(true);
                    d.setCreatedAt(new Date());
                    d.setCreatedBy("HR Import");
                    return departmentRepository.save(d);
                });
    }

    private Position findPosition(String name) {
        String positionName = clean(name);
        if (positionName == null) return null;

        return positionRepository.findByPositionTitleIgnoreCase(positionName)
                .orElse(null);
    }

    private Role getOrCreateRole(String name) {
        String roleName = clean(name);
        if (roleName == null) roleName = "EMPLOYEE";

        String finalRoleName = roleName;

        return roleRepository.findAll()
                .stream()
                .filter(r -> r.getName().equalsIgnoreCase(finalRoleName))
                .findFirst()
                .orElseGet(() -> {
                    Role role = new Role();
                    role.setName(finalRoleName.toUpperCase());
                    role.setDescription("Auto-created by HR employee import");
                    return roleRepository.save(role);
                });
    }

    private Employee findOrCreateEmployeeForAccount(HrEmployeeAccountCreateRequest request) {
        String email = cleanEmail(request.getEmail());
        return employeeRepository.findByEmail(email).orElseGet(() -> {
            Employee employee = new Employee();
            employee.setEmail(email);
            employee.setFirstName(clean(request.getFirstName()) != null ? clean(request.getFirstName()) : deriveFirstName(request.getFullName()));
            employee.setLastName(clean(request.getLastName()) != null ? clean(request.getLastName()) : deriveLastName(request.getFullName()));
            employee.setStaffNrc(clean(request.getEmployeeCode()));
            Position position = findPosition(request.getPositionName());
            employee.setPosition(position);
            employee.setActive(true);
            return employeeRepository.save(employee);
        });
    }

    private String deriveFirstName(String fullName) {
        String value = clean(fullName);
        if (value == null) return "Employee";
        String[] parts = value.split("\\s+");
        return parts.length > 0 ? parts[0] : "Employee";
    }

    private String deriveLastName(String fullName) {
        String value = clean(fullName);
        if (value == null) return "User";
        String[] parts = value.split("\\s+");
        return parts.length > 1 ? parts[parts.length - 1] : "User";
    }

    private List<Map<String, String>> readCsv(MultipartFile file) throws Exception {
        List<Map<String, String>> rows = new ArrayList<>();

        BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream())
        );

        String headerLine = reader.readLine();
        if (headerLine == null) return rows;

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
        if (headerRow == null) return rows;

        List<String> headers = new ArrayList<>();
        DataFormatter formatter = new DataFormatter();

        for (Cell cell : headerRow) {
            headers.add(formatter.formatCellValue(cell).trim());
        }

        for (int i = 1; i <= sheet.getLastRowNum(); i++) {
            Row excelRow = sheet.getRow(i);
            if (excelRow == null) continue;

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
            if (row.containsKey(key)) return row.get(key);
        }
        return null;
    }

    private String clean(String value) {
        if (value == null) return null;

        String v = value.trim();

        if (v.isEmpty()
                || v.equalsIgnoreCase("null")
                || v.equalsIgnoreCase("nil")
                || v.equalsIgnoreCase("n/a")
                || v.equalsIgnoreCase("xxx")
                || v.equals("-")) {
            return null;
        }

        return v;
    }

    private String cleanEmail(String email) {
        String value = clean(email);
        return value == null ? null : value.toLowerCase();
    }
}