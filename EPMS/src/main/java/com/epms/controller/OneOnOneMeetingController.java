//package com.epms.controller;
//
//import com.epms.dto.FollowUpRequestDto;
//import com.epms.dto.GenericApiResponse;
//import com.epms.dto.OneOnOneMeetingRequestDto;
//import com.epms.dto.OneOnOneMeetingResponseDto;
//import com.epms.service.OneOnOneMeetingService;
//import lombok.RequiredArgsConstructor;
//import org.springframework.http.HttpStatus;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
//
//import java.util.List;
//
//@RestController
//@RequestMapping("/api/one-on-one-meetings")
//@RequiredArgsConstructor
//@CrossOrigin(origins = "*")
//public class OneOnOneMeetingController {
//
//    private final OneOnOneMeetingService meetingService;
//
//    /** Create a new 1:1 meeting. Manager ID is resolved from the JWT token. */
//    @PostMapping
//    public ResponseEntity<GenericApiResponse<OneOnOneMeetingResponseDto>> createMeeting(
//            @RequestBody OneOnOneMeetingRequestDto request) {
//        OneOnOneMeetingResponseDto created = meetingService.createMeeting(request);
//        return ResponseEntity.status(HttpStatus.CREATED)
//                .body(GenericApiResponse.success("Meeting created", created));
//    }
//
//    // added KHN ( ChatGPT)
//    @PutMapping("/{id}")
//    public ResponseEntity<?> update(@PathVariable Integer id,
//                                    @RequestBody OneOnOneMeetingRequestDto req) {
//        return ResponseEntity.ok(meetingService.updateMeeting(id, req));
//    }
//    @DeleteMapping("/{id}")
//    public ResponseEntity<?> delete(@PathVariable Integer id) {
//        meetingService.deleteMeeting(id);
//        return ResponseEntity.ok("Deleted");
//    }
//
//    /** Get a single meeting by ID */
//    @GetMapping("/{id}")
//    public ResponseEntity<GenericApiResponse<OneOnOneMeetingResponseDto>> getMeetingById(
//            @PathVariable Integer id) {
//        return ResponseEntity.ok(
//                GenericApiResponse.success("Meeting fetched", meetingService.getMeetingById(id)));
//    }
//
//    /** Upcoming meetings: scheduledDate in the future and not yet finalized */
//    @GetMapping("/upcoming")
//    public ResponseEntity<GenericApiResponse<List<OneOnOneMeetingResponseDto>>> getUpcoming() {
//        return ResponseEntity.ok(
//                GenericApiResponse.success("Upcoming meetings", meetingService.getUpcomingMeetings()));
//    }
//
//    /** Ongoing meetings: status=true and not yet finalized */
//    @GetMapping("/ongoing")
//    public ResponseEntity<GenericApiResponse<List<OneOnOneMeetingResponseDto>>> getOngoing() {
//        return ResponseEntity.ok(
//                GenericApiResponse.success("Ongoing meetings", meetingService.getOngoingMeetings()));
//    }
//
//    /** Past meetings: isFinalized is set */
//    @GetMapping("/past")
//    public ResponseEntity<GenericApiResponse<List<OneOnOneMeetingResponseDto>>> getPast() {
//        return ResponseEntity.ok(
//                GenericApiResponse.success("Past meetings", meetingService.getPastMeetings()));
//    }
//
//    /** Mark a meeting as finished — server auto-stamps isFinalized with current time */
//    @PostMapping("/{id}/finish")
//    public ResponseEntity<GenericApiResponse<OneOnOneMeetingResponseDto>> finishMeeting(
//            @PathVariable Integer id) {
//        return ResponseEntity.ok(
//                GenericApiResponse.success("Meeting finished", meetingService.finishMeeting(id)));
//    }
//
//    /** Set or update the follow-up date for a meeting (does NOT finalize it) */
//    @PutMapping("/{id}/follow-up")
//    public ResponseEntity<GenericApiResponse<OneOnOneMeetingResponseDto>> setFollowUp(
//            @PathVariable Integer id,
//            @RequestBody FollowUpRequestDto request) {
//        return ResponseEntity.ok(
//                GenericApiResponse.success("Follow-up set", meetingService.setFollowUp(id, request)));
//    }
//}

// khn (chatgpt)
package com.epms.controller;

import com.epms.dto.FollowUpRequestDto;
import com.epms.dto.GenericApiResponse;
import com.epms.dto.OneOnOneMeetingRequestDto;
import com.epms.dto.OneOnOneMeetingResponseDto;
import com.epms.service.OneOnOneMeetingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/one-on-one-meetings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class OneOnOneMeetingController {

    private final OneOnOneMeetingService meetingService;

    @PostMapping
    public ResponseEntity<GenericApiResponse<OneOnOneMeetingResponseDto>> createMeeting(
            @RequestBody OneOnOneMeetingRequestDto request) {
        OneOnOneMeetingResponseDto created = meetingService.createMeeting(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GenericApiResponse.success("Meeting created", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GenericApiResponse<OneOnOneMeetingResponseDto>> update(
            @PathVariable Integer id,
            @RequestBody OneOnOneMeetingRequestDto request) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Meeting updated", meetingService.updateMeeting(id, request))
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<GenericApiResponse<String>> delete(@PathVariable Integer id) {
        meetingService.deleteMeeting(id);
        return ResponseEntity.ok(GenericApiResponse.success("Meeting cancelled", "Deleted"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<GenericApiResponse<OneOnOneMeetingResponseDto>> getMeetingById(
            @PathVariable Integer id) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Meeting fetched", meetingService.getMeetingById(id)));
    }

    @GetMapping("/upcoming")
    public ResponseEntity<GenericApiResponse<List<OneOnOneMeetingResponseDto>>> getUpcoming() {
        return ResponseEntity.ok(
                GenericApiResponse.success("Upcoming meetings", meetingService.getUpcomingMeetings()));
    }

    @GetMapping("/ongoing")
    public ResponseEntity<GenericApiResponse<List<OneOnOneMeetingResponseDto>>> getOngoing() {
        return ResponseEntity.ok(
                GenericApiResponse.success("Ongoing meetings", meetingService.getOngoingMeetings()));
    }

    @GetMapping("/past")
    public ResponseEntity<GenericApiResponse<List<OneOnOneMeetingResponseDto>>> getPast() {
        return ResponseEntity.ok(
                GenericApiResponse.success("Past meetings", meetingService.getPastMeetings()));
    }

    @PostMapping("/{id}/finish")
    public ResponseEntity<GenericApiResponse<OneOnOneMeetingResponseDto>> finishMeeting(
            @PathVariable Integer id) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Meeting finished", meetingService.finishMeeting(id)));
    }

    @PutMapping("/{id}/follow-up")
    public ResponseEntity<GenericApiResponse<OneOnOneMeetingResponseDto>> setFollowUp(
            @PathVariable Integer id,
            @RequestBody FollowUpRequestDto request) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Follow-up set", meetingService.setFollowUp(id, request)));
    }
}