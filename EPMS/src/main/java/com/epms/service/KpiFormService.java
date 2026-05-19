package com.epms.service;

import com.epms.dto.KpiFormRequestDTO;
import com.epms.dto.KpiFormResponseDTO;
import com.epms.dto.KpiPositionAssignmentDto;
import com.epms.dto.KpiPositionAvailabilityDto;
import com.epms.dto.PositionResponseDto;

import java.util.List;

public interface KpiFormService {

    KpiFormResponseDTO createTemplate(KpiFormRequestDTO dto);

    KpiFormResponseDTO updateTemplate(Integer id, KpiFormRequestDTO dto);

    void deleteTemplate(Integer id);

    List<KpiFormResponseDTO> getAllTemplates();

    KpiFormResponseDTO getTemplateById(Integer id);

    List<Integer> getAssignedPositionIds(Integer excludeFormId);

    List<KpiPositionAssignmentDto> getPositionAssignments(Integer excludeFormId);

    KpiPositionAvailabilityDto checkPositionAvailability(Integer positionId, Integer excludeFormId);

    List<PositionResponseDto> getAvailablePositions(Integer excludeFormId);

    KpiFormResponseDTO getTemplateByPositionId(Integer positionId);
}
