package com.epms.service;

import com.epms.dto.ContinuousFeedbackRequestDto;
import com.epms.dto.ContinuousFeedbackResponseDto;
import com.epms.dto.TeamEmployeeOptionResponseDto;
import com.epms.dto.TeamOptionResponseDto;

import java.util.List;

public interface ContinuousFeedbackService {
    List<TeamOptionResponseDto> getMyTeams();

    List<TeamEmployeeOptionResponseDto> getActiveEmployeesByTeam(Integer teamId);

    List<TeamEmployeeOptionResponseDto> getEligibleEmployees(Integer teamId);

    ContinuousFeedbackResponseDto create(ContinuousFeedbackRequestDto request);

    List<ContinuousFeedbackResponseDto> getMyGivenFeedback();

    List<ContinuousFeedbackResponseDto> getMyReceivedFeedback();

    List<ContinuousFeedbackResponseDto> getVisibleFeedback();
}
