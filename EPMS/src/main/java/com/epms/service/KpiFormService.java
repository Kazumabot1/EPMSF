package com.epms.service;

import com.epms.dto.KpiFormRequestDTO;
import com.epms.dto.KpiFormResponseDTO;

import java.util.List;

public interface KpiFormService {

    KpiFormResponseDTO createTemplate(KpiFormRequestDTO dto);

    KpiFormResponseDTO updateTemplate(Integer id, KpiFormRequestDTO dto);

    void deleteTemplate(Integer id);

    List<KpiFormResponseDTO> getAllTemplates();

    KpiFormResponseDTO getTemplateById(Integer id);
}
