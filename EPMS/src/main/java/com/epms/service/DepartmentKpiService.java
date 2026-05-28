package com.epms.service;

import com.epms.dto.*;

import java.util.List;

public interface DepartmentKpiService {
    DepartmentKpiTemplateResponseDto createTemplate(DepartmentKpiTemplateRequestDto request);
    DepartmentKpiTemplateResponseDto updateTemplate(Integer id, DepartmentKpiTemplateRequestDto request);
    void deleteTemplate(Integer id);
    List<DepartmentKpiTemplateResponseDto> listTemplates();
    DepartmentKpiTemplateResponseDto getTemplate(Integer id);

    DepartmentKpiCycleResponseDto createCycle(DepartmentKpiCycleRequestDto request);
    DepartmentKpiCycleResponseDto updateCycle(Integer id, DepartmentKpiCycleRequestDto request);
    List<DepartmentKpiCycleResponseDto> listCycles();
    DepartmentKpiCycleResponseDto getCycle(Integer id);
    DepartmentKpiCycleResponseDto updateCycleStatus(Integer id, boolean request);
    List<DepartmentKpiCycleResponseDto> listPendingEarlyCloseRequests();
    DepartmentKpiCycleResponseDto approveEarlyClose(Integer id, String reviewReason);
    DepartmentKpiCycleResponseDto rejectEarlyClose(Integer id, String reviewReason);

    List<DepartmentKpiTemplateSummaryDto> listWorkflowTemplates();
    List<DepartmentKpiResultDto> listAssignments(Integer templateId, Integer cyclePeriodId);
    DepartmentKpiResultDto updateScores(Integer resultId, UpdateDepartmentKpiScoresRequest request);
    DepartmentKpiResultDto requestFinalization(Integer resultId, DepartmentKpiFinalizationRequestDto request);
    DepartmentKpiResultDto finalizeResult(Integer resultId);
    int finalizeTemplate(Integer templateId, Integer cyclePeriodId);
    List<DepartmentKpiResultDto> listFinalizedResults();
    List<DepartmentKpiResultDto> listInProgressResults();
    List<DepartmentKpiResultDto> listDepartmentHeadResults();
    List<DepartmentKpiResultDto> listPendingFinalizationRequests();
    DepartmentKpiResultDto approveFinalization(Integer resultId, String reviewReason);
    DepartmentKpiResultDto rejectFinalization(Integer resultId, String reviewReason);
}
