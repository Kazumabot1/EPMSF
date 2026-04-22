// KHN new file
// (DTO for returning candidate users and employees with their current active team)

package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CandidateResponseDto {
    private Integer id;
    private String name;
    private String type; // "USER" (for leaders) or "EMPLOYEE" (for members)
    private Integer departmentId; // Only relevant for leaders
    private String departmentName; // Only relevant for leaders
    private boolean isAvailable;
    private Integer currentTeamId;
    private String currentTeamName;
}
