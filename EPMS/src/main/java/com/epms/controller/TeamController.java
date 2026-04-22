// KHN new file
// (REST API controller for Team management)

package com.epms.controller;

import com.epms.dto.TeamRequestDto;
import com.epms.dto.TeamResponseDto;
import com.epms.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // KHN added for frontend access
public class TeamController {

    private final TeamService teamService;

    // KHN added parts
    // (Endpoint to create a new team)
    @PostMapping
    public ResponseEntity<TeamResponseDto> createTeam(@RequestBody TeamRequestDto requestDto) {
        return ResponseEntity.ok(teamService.createTeam(requestDto));
    }

    // KHN added parts
    // (Endpoint to get all teams)
    @GetMapping
    public ResponseEntity<List<TeamResponseDto>> getAllTeams() {
        return ResponseEntity.ok(teamService.getAllTeams());
    }

    // KHN added parts
    // (Endpoint to get team by ID)
    @GetMapping("/{id}")
    public ResponseEntity<TeamResponseDto> getTeamById(@PathVariable Integer id) {
        return ResponseEntity.ok(teamService.getTeamById(id));
    }

    // KHN added parts
    // (Endpoint to get teams by department)
    @GetMapping("/department/{deptId}")
    public ResponseEntity<List<TeamResponseDto>> getTeamsByDepartment(@PathVariable Integer deptId) {
        return ResponseEntity.ok(teamService.getTeamsByDepartment(deptId));
    }

    // KHN added parts
    // (Endpoint to update an existing team and sync members)
    @PutMapping("/{id}")
    public ResponseEntity<com.epms.dto.GenericApiResponse<TeamResponseDto>> updateTeam(@PathVariable Integer id, @RequestBody TeamRequestDto requestDto) {
        return ResponseEntity.ok(com.epms.dto.GenericApiResponse.success("Team updated successfully", teamService.updateTeam(id, requestDto)));
    }

    // KHN added parts
    // (Endpoint to get available candidate leaders for a department)
    @GetMapping("/candidates/users/{deptId}")
    public ResponseEntity<com.epms.dto.GenericApiResponse<List<com.epms.dto.CandidateResponseDto>>> getCandidateUsers(@PathVariable Integer deptId) {
        return ResponseEntity.ok(com.epms.dto.GenericApiResponse.success("Candidate users fetched", teamService.getCandidateUsers(deptId)));
    }

    // KHN added parts
    // (Endpoint to get all candidate employees)
    @GetMapping("/candidates/employees")
    public ResponseEntity<com.epms.dto.GenericApiResponse<List<com.epms.dto.CandidateResponseDto>>> getCandidateEmployees() {
        return ResponseEntity.ok(com.epms.dto.GenericApiResponse.success("Candidate employees fetched", teamService.getCandidateEmployees()));
    }
}
