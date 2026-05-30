package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.dto.TeamResponseDto;
import com.epms.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Manager-scoped REST controller.
 * Managers can read team data for dashboard/reporting views.
 */
@RestController
@RequestMapping("/api/manager")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize(
        "hasRole('MANAGER') " +
                "or hasAuthority('ROLE_MANAGER') " +
                "or authentication.principal.dashboard == 'MANAGER_DASHBOARD' " +
                "or hasRole('HR') " +
                "or hasRole('HRADMIN')"
)
public class ProjectManagerController {

    private final TeamService teamService;

    @GetMapping("/teams")
    public ResponseEntity<GenericApiResponse<List<TeamResponseDto>>> getAllTeams() {
        return ResponseEntity.ok(
                GenericApiResponse.success("All teams fetched", teamService.getAllTeams())
        );
    }

    @GetMapping("/teams/{id}")
    public ResponseEntity<GenericApiResponse<TeamResponseDto>> getTeamById(@PathVariable Integer id) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Team fetched", teamService.getTeamById(id))
        );
    }

    @GetMapping("/dashboard")
    public ResponseEntity<GenericApiResponse<Object>> dashboard() {
        List<TeamResponseDto> allTeams = teamService.getAllTeams();
        long activeTeams = allTeams.stream()
                .filter(team -> "Active".equalsIgnoreCase(team.getStatus()))
                .count();

        Map<String, Object> data = Map.of(
                "totalTeams", allTeams.size(),
                "activeTeams", activeTeams
        );

        return ResponseEntity.ok(
                GenericApiResponse.success("Manager dashboard fetched", data)
        );
    }
}