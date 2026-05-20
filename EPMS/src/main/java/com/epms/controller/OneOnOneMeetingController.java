package com.epms.controller;

import com.epms.dto.FollowUpRequestDto;
import com.epms.dto.GenericApiResponse;
import com.epms.dto.OneOnOneAccessContextResponseDto;
import com.epms.dto.OneOnOneMeetingRequestDto;
import com.epms.dto.OneOnOneMeetingResponseDto;
import com.epms.dto.TeamEmployeeOptionResponseDto;
import com.epms.dto.TeamOptionResponseDto;
import com.epms.service.OneOnOneMeetingService;
import com.epms.service.TeamAccessService;
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
    private final TeamAccessService teamAccessService;

    @GetMapping("/context")
    public ResponseEntity<GenericApiResponse<OneOnOneAccessContextResponseDto>> getContext() {
        return ResponseEntity.ok(
                GenericApiResponse.success("One-on-one context retrieved", teamAccessService.getOneOnOneContext())
        );
    }

    @GetMapping("/my-teams")
    public ResponseEntity<GenericApiResponse<List<TeamOptionResponseDto>>> getMyTeams() {
        return ResponseEntity.ok(
                GenericApiResponse.success("Teams retrieved", teamAccessService.getManagedTeamOptionsForCurrentUser())
        );
    }

    @GetMapping("/teams")
    public ResponseEntity<GenericApiResponse<List<TeamOptionResponseDto>>> getTeamsForScope(
            @RequestParam(required = false) Integer departmentId
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Teams retrieved", teamAccessService.getOneOnOneTeamOptions(departmentId))
        );
    }

    @GetMapping("/teams/{teamId}/active-employees")
    public ResponseEntity<GenericApiResponse<List<TeamEmployeeOptionResponseDto>>> getActiveEmployeesByTeam(
            @PathVariable Integer teamId,
            @RequestParam(required = false) Integer departmentId
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Team employees retrieved", teamAccessService.getActiveEmployeesForTeamScope(teamId, departmentId))
        );
    }

    @GetMapping("/departments/{departmentId}/active-employees")
    public ResponseEntity<GenericApiResponse<List<TeamEmployeeOptionResponseDto>>> getActiveEmployeesByDepartmentScope(
            @PathVariable Integer departmentId
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Department employees retrieved", teamAccessService.getActiveEmployeesForDepartmentScope(departmentId))
        );
    }

    @PostMapping
    public ResponseEntity<GenericApiResponse<OneOnOneMeetingResponseDto>> createMeeting(
            @RequestBody OneOnOneMeetingRequestDto request
    ) {
        teamAccessService.validateOneOnOneCreateRequest(request);

        OneOnOneMeetingResponseDto created = meetingService.createMeeting(request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GenericApiResponse.success("Meeting created", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GenericApiResponse<OneOnOneMeetingResponseDto>> update(
            @PathVariable Integer id,
            @RequestBody OneOnOneMeetingRequestDto request
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Meeting updated", meetingService.updateMeeting(id, request))
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<GenericApiResponse<String>> delete(@PathVariable Integer id) {
        meetingService.deleteMeeting(id);

        return ResponseEntity.ok(
                GenericApiResponse.success("Meeting cancelled", "Deleted")
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<GenericApiResponse<OneOnOneMeetingResponseDto>> getMeetingById(
            @PathVariable Integer id
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Meeting fetched", meetingService.getMeetingById(id))
        );
    }

    @GetMapping("/upcoming")
    public ResponseEntity<GenericApiResponse<List<OneOnOneMeetingResponseDto>>> getUpcoming() {
        return ResponseEntity.ok(
                GenericApiResponse.success("Upcoming meetings", meetingService.getUpcomingMeetings())
        );
    }

    @GetMapping("/ongoing")
    public ResponseEntity<GenericApiResponse<List<OneOnOneMeetingResponseDto>>> getOngoing() {
        return ResponseEntity.ok(
                GenericApiResponse.success("Ongoing meetings", meetingService.getOngoingMeetings())
        );
    }

    @GetMapping("/past")
    public ResponseEntity<GenericApiResponse<List<OneOnOneMeetingResponseDto>>> getPast() {
        return ResponseEntity.ok(
                GenericApiResponse.success("Past meetings", meetingService.getPastMeetings())
        );
    }

    @PostMapping("/{id}/finish")
    public ResponseEntity<GenericApiResponse<OneOnOneMeetingResponseDto>> finishMeeting(
            @PathVariable Integer id
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Meeting finished", meetingService.finishMeeting(id))
        );
    }

    @RequestMapping(value = "/{id}/follow-up", method = {RequestMethod.PUT, RequestMethod.POST})
    public ResponseEntity<GenericApiResponse<OneOnOneMeetingResponseDto>> setFollowUp(
            @PathVariable Integer id,
            @RequestBody FollowUpRequestDto request
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Follow-up set", meetingService.setFollowUp(id, request))
        );
    }
}