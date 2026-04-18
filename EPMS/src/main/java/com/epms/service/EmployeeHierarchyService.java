package com.epms.service;

import java.util.List;

/**
 * Port interface defining domain boundary queries for employee hierarchy.
 * Represents external module interactions needed for auto-selecting evaluators.
 */
public interface EmployeeHierarchyService {
    Long getManagerId(Long employeeId);
    List<Long> getRandomPeers(Long employeeId, int count);
    List<Long> getSubordinates(Long employeeId);
}
