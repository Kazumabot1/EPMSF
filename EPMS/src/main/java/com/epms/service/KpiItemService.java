package com.epms.service;

import com.epms.dto.KpiItemRequestDto;
import com.epms.dto.KpiItemResponseDto;

import java.util.List;

public interface KpiItemService {

    KpiItemResponseDto createKpiItem(KpiItemRequestDto requestDto);

    List<KpiItemResponseDto> getAllKpiItems();

    KpiItemResponseDto getKpiItemById(Integer id);

    KpiItemResponseDto updateKpiItem(Integer id, KpiItemRequestDto requestDto);

    void deleteKpiItem(Integer id);
}
