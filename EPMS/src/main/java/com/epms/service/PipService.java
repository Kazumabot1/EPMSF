package com.epms.service;

import com.epms.dto.PipRequestDto;
import com.epms.dto.PipResponseDto;

import java.util.List;

public interface PipService {

    PipResponseDto createPip(PipRequestDto requestDto);

    List<PipResponseDto> getAllPips();

    PipResponseDto getPipById(Integer id);

    PipResponseDto updatePip(Integer id, PipRequestDto requestDto);

    void deletePip(Integer id);
}
