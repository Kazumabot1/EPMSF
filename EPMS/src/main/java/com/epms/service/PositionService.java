package com.epms.service;

import com.epms.dto.PositionRequestDto;
import com.epms.dto.PositionResponseDto;

import java.util.List;

public interface PositionService {

    PositionResponseDto create(PositionRequestDto dto);

    List<PositionResponseDto> getAll();

    PositionResponseDto getById(Integer id);

    PositionResponseDto update(Integer id, PositionRequestDto dto);

    void delete(Integer id);
}
