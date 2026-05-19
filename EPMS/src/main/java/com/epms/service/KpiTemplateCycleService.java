package com.epms.service;

import com.epms.dto.KpiTemplateCycleRequestDTO;
import com.epms.dto.KpiTemplateCycleResponseDTO;

import java.util.List;

public interface KpiTemplateCycleService {

    KpiTemplateCycleResponseDTO create(KpiTemplateCycleRequestDTO dto);

    KpiTemplateCycleResponseDTO update(Integer id, KpiTemplateCycleRequestDTO dto);

    List<KpiTemplateCycleResponseDTO> list();

    KpiTemplateCycleResponseDTO getById(Integer id);

    KpiTemplateCycleResponseDTO updateStatus(Integer id, boolean active);
}
