package com.epms.service;

import com.epms.dto.EmployeeRequestDto;
import com.epms.dto.EmployeeResponseDto;

import java.util.List;

public interface EmployeeService {

    List<EmployeeResponseDto> getAllEmployees(boolean includeInactive);

    EmployeeResponseDto getEmployeeById(Integer id);

    EmployeeResponseDto createEmployee(EmployeeRequestDto request);

    EmployeeResponseDto updateEmployee(Integer id, EmployeeRequestDto request);

    EmployeeResponseDto deactivateEmployee(Integer id);
    List<EmployeeResponseDto> getMyDepartmentEmployees(boolean includeInactive);

    EmployeeResponseDto getMyDepartmentEmployeeById(Integer id);
}
