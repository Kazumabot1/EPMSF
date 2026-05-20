package com.epms.controller;

import com.epms.dto.ContinuousFeedbackRequestDto;
import com.epms.dto.ContinuousFeedbackResponseDto;
import com.epms.dto.GenericApiResponse;
import com.epms.dto.TeamEmployeeOptionResponseDto;
import com.epms.dto.TeamOptionResponseDto;
import com.epms.service.ContinuousFeedbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/continuous-feedback")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ContinuousFeedbackController {

    private final ContinuousFeedbackService continuousFeedbackService;

    @GetMapping("/my-teams")
    public ResponseEntity<GenericApiResponse<List<TeamOptionResponseDto>>> getMyTeams() {
        return ResponseEntity.ok(
                GenericApiResponse.success("Teams retrieved", continuousFeedbackService.getMyTeams())
        );
    }

    @GetMapping("/teams/{teamId}/employees")
    public ResponseEntity<GenericApiResponse<List<TeamEmployeeOptionResponseDto>>> getTeamEmployees(
            @PathVariable Integer teamId
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Team employees retrieved", continuousFeedbackService.getActiveEmployeesByTeam(teamId))
        );
    }


    @GetMapping("/employees")
    public ResponseEntity<GenericApiResponse<List<TeamEmployeeOptionResponseDto>>> getEligibleEmployees(
            @RequestParam(required = false) Integer teamId
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Eligible employees retrieved", continuousFeedbackService.getEligibleEmployees(teamId))
        );
    }

    @PostMapping
    public ResponseEntity<GenericApiResponse<ContinuousFeedbackResponseDto>> create(
            @RequestBody ContinuousFeedbackRequestDto request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GenericApiResponse.success("Continuous feedback submitted", continuousFeedbackService.create(request)));
    }

    @GetMapping("/given")
    public ResponseEntity<GenericApiResponse<List<ContinuousFeedbackResponseDto>>> getGiven() {
        return ResponseEntity.ok(
                GenericApiResponse.success("Given feedback retrieved", continuousFeedbackService.getMyGivenFeedback())
        );
    }

    @GetMapping("/received")
    public ResponseEntity<GenericApiResponse<List<ContinuousFeedbackResponseDto>>> getReceived() {
        return ResponseEntity.ok(
                GenericApiResponse.success("Received feedback retrieved", continuousFeedbackService.getMyReceivedFeedback())
        );
    }
}