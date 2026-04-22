// KHN new file
// (Service interface for Team operations)

package com.epms.service;

import com.epms.dto.TeamRequestDto;
import com.epms.dto.TeamResponseDto;

import java.util.List;

public interface TeamService {
    // KHN added parts
    // (Create a new team with members)
    TeamResponseDto createTeam(TeamRequestDto requestDto);
    
    // KHN added parts
    // (Get all teams)
    List<TeamResponseDto> getAllTeams();
    
    // KHN added parts
    // (Get teams by department)
    List<TeamResponseDto> getTeamsByDepartment(Integer departmentId);
    
    // KHN added parts
    // (Get team by ID)
    TeamResponseDto getTeamById(Integer id);

    // KHN added parts
    // (Update an existing team)
    TeamResponseDto updateTeam(Integer id, TeamRequestDto requestDto);

    // KHN added parts
    // (Get candidate users for team leader selection)
    List<com.epms.dto.CandidateResponseDto> getCandidateUsers(Integer departmentId);

    // KHN added parts
    // (Get candidate employees for team member selection)
    List<com.epms.dto.CandidateResponseDto> getCandidateEmployees();
}
