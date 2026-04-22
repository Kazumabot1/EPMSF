// KHN new file
// (DTO for team data responses)

package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeamResponseDto {
    private Integer id;
    private String teamName;
    private Integer departmentId;
    private String departmentName;
    private Integer teamLeaderId;
    private String teamLeaderName;
    private Integer createdById;
    private String createdByName;
    private Date createdDate;
    private String status;
    private String teamGoal;
    private List<MemberInfo> members;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MemberInfo {
        private Integer employeeId;
        private String employeeName;
        private Date startedDate;
    }
}
