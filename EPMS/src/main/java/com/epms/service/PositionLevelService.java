package com.epms.service;

import com.epms.dto.PositionLevelRequestDto;
import com.epms.dto.PositionLevelResponseDto;

import java.util.List;

public interface PositionLevelService {

    PositionLevelResponseDto create(PositionLevelRequestDto dto);

    List<PositionLevelResponseDto> getAll();

    PositionLevelResponseDto getById(Integer id);

    PositionLevelResponseDto update(Integer id, PositionLevelRequestDto dto);

    void delete(Integer id);
}
