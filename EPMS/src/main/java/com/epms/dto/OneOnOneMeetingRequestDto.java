//package com.epms.dto;
//
//import lombok.Data;
//
//import java.time.LocalDateTime;
//
//@Data
//public class OneOnOneMeetingRequestDto {
//
//    private Integer employeeId;       // The employee being met with
//    private LocalDateTime scheduledDate; // Full datetime: e.g. 2026-05-01T10:30:00
//    private String notes;             // Notes for the meeting
//    private Integer parentMeetingId;  // Null unless this is a follow-up meeting
//}
package com.epms.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class OneOnOneMeetingRequestDto {

    private Integer employeeId;
    private LocalDateTime scheduledDate;
    private String notes;
    private Integer parentMeetingId;

    // true only after HR confirms warning modal
    private Boolean forceCreate = false;
    private String followUpNotes;
}