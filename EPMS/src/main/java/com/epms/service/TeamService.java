

package com.epms.service;

import com.epms.dto.CandidateResponseDto;
import com.epms.dto.TeamHistoryResponseDto;
import com.epms.dto.TeamRequestDto;
import com.epms.dto.TeamResponseDto;

import java.util.List;

public interface TeamService {

    List<TeamResponseDto> getAllTeams();

    TeamResponseDto getTeamById(Integer id);

    List<TeamResponseDto> getTeamsByDepartment(Integer departmentId);

    TeamResponseDto createTeam(TeamRequestDto request);

    TeamResponseDto updateTeam(Integer id, TeamRequestDto request);

    void deleteTeam(Integer id);

    List<CandidateResponseDto> getCandidateUsers(Integer departmentId);

    List<CandidateResponseDto> getCandidateMembers(Integer departmentId);

    List<CandidateResponseDto> getCandidateProjectManagers(Integer departmentId);

    List<TeamHistoryResponseDto> getTeamHistory(Integer teamId);

    List<TeamResponseDto> getMyDepartmentTeams();

    List<TeamResponseDto> getMyTeams();

    TeamResponseDto getMyDepartmentTeamById(Integer id);

    TeamResponseDto createMyDepartmentTeam(TeamRequestDto request);

    TeamResponseDto updateMyDepartmentTeam(Integer id, TeamRequestDto request);

    List<CandidateResponseDto> getMyDepartmentCandidateUsers();

    List<CandidateResponseDto> getMyDepartmentCandidateMembers();

    List<CandidateResponseDto> getMyDepartmentCandidateProjectManagers();

    List<TeamHistoryResponseDto> getMyDepartmentTeamHistory(Integer teamId);
}