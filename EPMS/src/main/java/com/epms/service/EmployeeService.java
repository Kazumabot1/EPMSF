package com.epms.service;

import com.epms.dto.EmployeeResponseDto;
import java.util.List;

public interface EmployeeService {
    List<EmployeeResponseDto> getAllEmployees();
}