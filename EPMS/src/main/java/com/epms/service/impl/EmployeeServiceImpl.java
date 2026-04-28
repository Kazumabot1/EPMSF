package com.epms.service.impl;

import com.epms.dto.AccountProvisionResult;
import com.epms.dto.EmployeeRequestDto;
import com.epms.dto.EmployeeResponseDto;
import com.epms.entity.Department;
import com.epms.entity.Employee;
import com.epms.entity.EmployeeDepartment;
import com.epms.entity.Position;
import com.epms.entity.User;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.EmployeeDepartmentRepository;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.PositionRepository;
import com.epms.repository.UserRepository;
import com.epms.service.EmployeeService;
import com.epms.service.UserAccountProvisioningService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import com.epms.security.SecurityUtils;
import com.epms.security.UserPrincipal;

@Service
@RequiredArgsConstructor
public class EmployeeServiceImpl implements EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final PositionRepository positionRepository;
    private final DepartmentRepository departmentRepository;
    private final EmployeeDepartmentRepository employeeDepartmentRepository;
    private final UserAccountProvisioningService userAccountProvisioningService;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<EmployeeResponseDto> getAllEmployees(boolean includeInactive) {
        List<Employee> employees = includeInactive
                ? employeeRepository.findAll()
                : employeeRepository.findAllActiveWithDepartments();

        return employees.stream()
                .map(this::mapToDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public EmployeeResponseDto getEmployeeById(Integer id) {
        Employee emp = employeeRepository.findWithDepartmentsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));

        return mapToDto(emp);
    }

    @Override
    @Transactional
    public EmployeeResponseDto createEmployee(EmployeeRequestDto request) {
        validateLoginAccountRequest(request);

        Employee employee = new Employee();
        copyRequestToEntity(request, employee);

        if (employee.getActive() == null) {
            employee.setActive(true);
        }

        Employee saved = employeeRepository.save(employee);
        syncDepartmentAssignment(request.getDepartmentId(), saved);

        AccountProvisionResult provision = null;

        if (Boolean.TRUE.equals(request.getCreateLoginAccount())) {
            provision = userAccountProvisioningService.provisionFromEmployee(
                    saved,
                    "EMPLOYEE",
                    Boolean.TRUE.equals(request.getSendTemporaryPasswordEmail())
            );

            syncLinkedUserFromEmployee(saved, request.getDepartmentId());
        }

        EmployeeResponseDto dto = getEmployeeById(saved.getId());
        mergeAccountProvisioning(dto, provision);

        return dto;
    }

    @Override
    @Transactional
    public EmployeeResponseDto updateEmployee(Integer id, EmployeeRequestDto request) {
        validateLoginAccountRequest(request);

        Employee employee = employeeRepository.findWithDepartmentsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));

        copyRequestToEntity(request, employee);

        Employee saved = employeeRepository.save(employee);
        syncDepartmentAssignment(request.getDepartmentId(), saved);

        AccountProvisionResult provision = null;

        if (Boolean.TRUE.equals(request.getCreateLoginAccount())) {
            provision = userAccountProvisioningService.provisionFromEmployee(
                    saved,
                    "EMPLOYEE",
                    Boolean.TRUE.equals(request.getSendTemporaryPasswordEmail())
            );
        }

        syncLinkedUserFromEmployee(saved, request.getDepartmentId());

        EmployeeResponseDto dto = getEmployeeById(id);
        mergeAccountProvisioning(dto, provision);

        return dto;
    }

    @Override
    @Transactional
    public EmployeeResponseDto deactivateEmployee(Integer id) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));

        if (Boolean.FALSE.equals(employee.getActive())) {
            throw new BusinessValidationException("Employee is already inactive.");
        }

        employee.setActive(false);
        employeeRepository.save(employee);

        userRepository.findByEmployeeId(employee.getId()).ifPresent(user -> {
            user.setActive(false);
            user.setUpdatedAt(new Date());
            userRepository.save(user);
        });

        return getEmployeeById(id);
    }

    private void syncLinkedUserFromEmployee(Employee employee, Integer departmentId) {
        userRepository.findByEmployeeId(employee.getId()).ifPresent(user -> {
            String firstName = employee.getFirstName() != null ? employee.getFirstName().trim() : "";
            String lastName = employee.getLastName() != null ? employee.getLastName().trim() : "";
            String fullName = (firstName + " " + lastName).trim();

            user.setFullName(fullName.isBlank() ? null : fullName);
            user.setEmail(trimToNull(employee.getEmail()));
            user.setEmployeeCode(trimToNull(employee.getStaffNrc()));
            user.setPosition(employee.getPosition());
            user.setDepartmentId(departmentId);
            user.setActive(employee.getActive() == null || employee.getActive());
            user.setUpdatedAt(new Date());

            userRepository.save(user);
        });
    }

    private void validateLoginAccountRequest(EmployeeRequestDto request) {
        if (!Boolean.TRUE.equals(request.getCreateLoginAccount())) {
            return;
        }

        if (!userAccountProvisioningService.isValidWorkEmail(request.getEmail())) {
            throw new BusinessValidationException(
                    "A valid work email is required when create login account is enabled.");
        }
    }

    private void mergeAccountProvisioning(EmployeeResponseDto dto, AccountProvisionResult provision) {
        if (provision == null) {
            return;
        }

        dto.setAccountProvisioningMessage(provision.getMessage());
        dto.setAccountProvisioningSuccess(provision.isSuccess());
        dto.setAccountProvisioningSmtpError(provision.getSmtpErrorDetail());
    }

    private void copyRequestToEntity(EmployeeRequestDto request, Employee employee) {
        employee.setFirstName(trimToNull(request.getFirstName()));
        employee.setLastName(trimToNull(request.getLastName()));
        employee.setPhoneNumber(trimToNull(request.getPhoneNumber()));
        employee.setEmail(trimToNull(request.getEmail()));
        employee.setStaffNrc(trimToNull(request.getStaffNrc()));
        employee.setGender(trimToNull(request.getGender()));
        employee.setRace(trimToNull(request.getRace()));
        employee.setReligion(trimToNull(request.getReligion()));
        employee.setDateOfBirth(request.getDateOfBirth());
        employee.setContactAddress(trimToNull(request.getContactAddress()));
        employee.setPermanentAddress(trimToNull(request.getPermanentAddress()));
        employee.setMaritalStatus(trimToNull(request.getMaritalStatus()));
        employee.setSpouseName(trimToNull(request.getSpouseName()));
        employee.setSpouseNrc(trimToNull(request.getSpouseNrc()));
        employee.setFatherName(trimToNull(request.getFatherName()));
        employee.setFatherNrc(trimToNull(request.getFatherNrc()));

        applyPosition(request.getPositionId(), employee);
    }

    private void applyPosition(Integer positionId, Employee employee) {
        if (positionId == null) {
            employee.setPosition(null);
            return;
        }

        Position position = positionRepository.findById(positionId)
                .orElseThrow(() -> new ResourceNotFoundException("Position not found with id: " + positionId));

        employee.setPosition(position);
    }

    private void syncDepartmentAssignment(Integer departmentId, Employee employee) {
        List<EmployeeDepartment> history = employee.getEmployeeDepartments() != null
                ? new ArrayList<>(employee.getEmployeeDepartments())
                : new ArrayList<>();

        Optional<EmployeeDepartment> currentOpt = history.stream()
                .filter(item -> item.getEnddate() == null)
                .max(Comparator.comparing(
                        item -> item.getStartdate() == null ? new Date(0) : item.getStartdate()
                ));

        Integer currentDeptId = currentOpt
                .map(item -> item.getDepartment() != null ? item.getDepartment().getId() : null)
                .orElse(null);

        if (departmentId == null) {
            currentOpt.ifPresent(this::closeDepartmentAssignment);
            return;
        }

        if (Objects.equals(currentDeptId, departmentId)) {
            return;
        }

        Department newDept = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + departmentId));

        currentOpt.ifPresent(this::closeDepartmentAssignment);

        EmployeeDepartment row = new EmployeeDepartment();
        row.setEmployee(employee);
        row.setDepartment(newDept);
        row.setStartdate(new Date());
        row.setEnddate(null);
        row.setCurrentdepartment(newDept.getDepartmentName());
        row.setParentdepartment(null);
        row.setAssignBy("HR");

        employeeDepartmentRepository.save(row);

        if (employee.getEmployeeDepartments() != null) {
            employee.getEmployeeDepartments().add(row);
        }
    }

    private void closeDepartmentAssignment(EmployeeDepartment row) {
        row.setEnddate(new Date());
        employeeDepartmentRepository.save(row);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String t = value.trim();
        return t.isEmpty() ? null : t;
    }

    private EmployeeResponseDto mapToDto(Employee emp) {
        List<EmployeeDepartment> history = emp.getEmployeeDepartments() == null
                ? List.of()
                : emp.getEmployeeDepartments()
                .stream()
                .filter(Objects::nonNull)
                .toList();

        Optional<EmployeeDepartment> currentAssignment = history.stream()
                .filter(item -> item.getEnddate() == null)
                .max(Comparator.comparing(
                        item -> item.getStartdate() == null ? new Date(0) : item.getStartdate()
                ));

        EmployeeDepartment latestAssignment = currentAssignment.orElseGet(() ->
                history.stream()
                        .max(Comparator.comparing(
                                item -> item.getStartdate() == null ? new Date(0) : item.getStartdate()
                        ))
                        .orElse(null)
        );

        Integer currentDepartmentId = null;
        String currentDepartment = null;
        String parentDepartment = null;
        String assignedBy = null;
        Date departmentStartDate = null;
        Date departmentEndDate = null;

        if (latestAssignment != null) {
            Department department = latestAssignment.getDepartment();

            if (department != null) {
                currentDepartmentId = department.getId();
            }

            currentDepartment =
                    latestAssignment.getCurrentdepartment() != null &&
                            !latestAssignment.getCurrentdepartment().isBlank()
                            ? latestAssignment.getCurrentdepartment()
                            : department != null
                            ? department.getDepartmentName()
                            : null;

            parentDepartment = latestAssignment.getParentdepartment();
            assignedBy = latestAssignment.getAssignBy();
            departmentStartDate = latestAssignment.getStartdate();
            departmentEndDate = latestAssignment.getEnddate();
        }

        String firstName = emp.getFirstName() != null ? emp.getFirstName() : "";
        String lastName = emp.getLastName() != null ? emp.getLastName() : "";
        String fullName = (firstName + " " + lastName).trim();

        Integer positionId = null;
        String positionTitle = null;
        String positionLevelCode = null;

        if (emp.getPosition() != null) {
            positionId = emp.getPosition().getId();
            positionTitle = emp.getPosition().getPositionTitle();

            if (emp.getPosition().getLevel() != null) {
                positionLevelCode = emp.getPosition().getLevel().getLevelCode();
            }
        }

        User linkedUser = userRepository.findByEmployeeId(emp.getId()).orElse(null);

        return new EmployeeResponseDto(
                emp.getId(),
                emp.getFirstName(),
                emp.getLastName(),
                fullName,
                emp.getPhoneNumber(),
                emp.getEmail(),
                emp.getStaffNrc(),
                emp.getGender(),
                emp.getRace(),
                emp.getReligion(),
                emp.getDateOfBirth(),
                emp.getMaritalStatus(),
                emp.getSpouseName(),
                emp.getSpouseNrc(),
                emp.getFatherName(),
                emp.getFatherNrc(),
                emp.getActive(),
                emp.getContactAddress(),
                emp.getPermanentAddress(),
                positionId,
                positionTitle,
                positionLevelCode,
                currentDepartmentId,
                currentDepartment,
                parentDepartment,
                assignedBy,
                departmentStartDate,
                departmentEndDate,
                history.size(),
                linkedUser != null ? linkedUser.getId() : null,
                linkedUser != null,
                linkedUser != null ? linkedUser.getMustChangePassword() : null,
                null,
                null,
                null
        );
    }
    @Override
    @Transactional(readOnly = true)
    public List<EmployeeResponseDto> getMyDepartmentEmployees(boolean includeInactive) {
        Integer departmentId = requireCurrentDepartmentId();

        return employeeRepository.findCurrentByDepartmentId(departmentId, includeInactive)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public EmployeeResponseDto getMyDepartmentEmployeeById(Integer id) {
        EmployeeResponseDto dto = getEmployeeById(id);
        assertSameDepartment(dto.getCurrentDepartmentId());
        return dto;
    }

    private Integer requireCurrentDepartmentId() {
        UserPrincipal currentUser = SecurityUtils.currentUser();

        if (currentUser.getDepartmentId() == null) {
            throw new BusinessValidationException("Current department head has no assigned department.");
        }

        return currentUser.getDepartmentId();
    }

    private void assertSameDepartment(Integer requestedDepartmentId) {
        Integer currentDepartmentId = requireCurrentDepartmentId();

        if (requestedDepartmentId == null || !requestedDepartmentId.equals(currentDepartmentId)) {
            throw new BusinessValidationException("You can only access employees from your own department.");
        }
    }
}