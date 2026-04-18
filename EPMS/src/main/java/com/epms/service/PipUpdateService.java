package com.epms.service;

import com.epms.dto.PipUpdateRequestDto;
import com.epms.dto.PipUpdateResponseDto;

import java.util.List;

public interface PipUpdateService {

    PipUpdateResponseDto createPipUpdate(PipUpdateRequestDto requestDto);

    List<PipUpdateResponseDto> getAllPipUpdates();

    PipUpdateResponseDto getPipUpdateById(Integer id);

    PipUpdateResponseDto updatePipUpdate(Integer id, PipUpdateRequestDto requestDto);

    void deletePipUpdate(Integer id);
}
