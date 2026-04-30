//package com.epms.dto;
//
//import lombok.Data;
//
//import java.time.LocalDateTime;
//
//@Data
//public class OneOnOneMeetingResponseDto {
//
//    private Integer id;
//
//    // Employee being met with
//    private Integer employeeId;
//    private String employeeFirstName;
//    private String employeeLastName;
//
//    // HR/Manager who created the meeting
//    private Integer managerId;
//    private String managerFirstName;
//    private String managerLastName;
//
//    private LocalDateTime scheduledDate;
//    private String notes;
//
//    // false = not started, true = ongoing
//    private Boolean status;
//
//    private LocalDateTime followUpDate;
//
//    // Null = not yet finalized
//    private LocalDateTime isFinalized;
//
//    private LocalDateTime createdAt;
//
//    // Set only if this is a follow-up meeting (references the original meeting ID)
//    private Integer parentMeetingId;
//
//    // Convenience flag: true when parentMeetingId is not null
//    private boolean followUp;
//
//    // Embedded action item (may be null if meeting hasn't started yet)
//    private OneOnOneActionItemResponseDto actionItem;
//}

package com.epms.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class OneOnOneMeetingResponseDto {

    private Integer id;

    private Integer employeeId;
    private String employeeFirstName;
    private String employeeLastName;

    private Integer managerId;
    private String managerFirstName;
    private String managerLastName;

    private LocalDateTime scheduledDate;
    private String notes;

    private Boolean status;

    private LocalDateTime followUpDate;
    private LocalDateTime isFinalized;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private Integer parentMeetingId;
    private boolean followUp;

    private OneOnOneActionItemResponseDto actionItem;

    private String followUpNotes;

}