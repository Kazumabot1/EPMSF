// KHN new file
// (DTO for team creation/update requests)

package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeamRequestDto {
    private String teamName;
    private Integer departmentId;
    private Integer teamLeaderId;
    private Integer createdById;
    private String teamGoal;
    private String status;
    private List<Integer> memberEmployeeIds;
}
