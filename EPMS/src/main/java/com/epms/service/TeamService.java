package com.epms.service;

import com.epms.dto.CandidateResponseDto;
import com.epms.dto.TeamRequestDto;
import com.epms.dto.TeamResponseDto;

import java.util.List;

public interface TeamService {
    TeamResponseDto createTeam(TeamRequestDto requestDto);

    List<TeamResponseDto> getAllTeams();

    List<TeamResponseDto> getTeamsByDepartment(Integer departmentId);

    TeamResponseDto getTeamById(Integer id);

    TeamResponseDto updateTeam(Integer id, TeamRequestDto requestDto);

    List<CandidateResponseDto> getCandidateUsers(Integer departmentId);

    List<CandidateResponseDto> getCandidateMembers(Integer deptId);
    List<TeamResponseDto> getMyDepartmentTeams();

    TeamResponseDto getMyDepartmentTeamById(Integer id);

    TeamResponseDto createMyDepartmentTeam(TeamRequestDto requestDto);

    TeamResponseDto updateMyDepartmentTeam(Integer id, TeamRequestDto requestDto);

    List<CandidateResponseDto> getMyDepartmentCandidateUsers();

    List<CandidateResponseDto> getMyDepartmentCandidateMembers();
}
