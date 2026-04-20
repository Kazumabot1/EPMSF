package com.epms.service;

import com.epms.dto.KpiRequestDto;
import com.epms.dto.KpiResponseDto;

import java.util.List;

public interface KpiService {

    KpiResponseDto create(KpiRequestDto dto);

    List<KpiResponseDto> getAll();

    KpiResponseDto getById(Integer id);

    KpiResponseDto update(Integer id, KpiRequestDto dto);

    void delete(Integer id);
}
