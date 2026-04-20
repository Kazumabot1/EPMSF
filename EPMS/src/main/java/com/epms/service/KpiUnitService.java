package com.epms.service;

import com.epms.dto.KpiUnitRequestDto;
import com.epms.dto.KpiUnitResponseDto;

import java.util.List;

public interface KpiUnitService {

    KpiUnitResponseDto create(KpiUnitRequestDto dto);

    List<KpiUnitResponseDto> getAll();

    KpiUnitResponseDto getById(Integer id);

    KpiUnitResponseDto update(Integer id, KpiUnitRequestDto dto);

    void delete(Integer id);
}
