package com.epms.service;

import com.epms.dto.OneOnOneMeetingRequestDto;
import com.epms.dto.OneOnOneMeetingResponseDto;

import java.util.List;

public interface OneOnOneMeetingService {

    OneOnOneMeetingResponseDto createOneOnOneMeeting(OneOnOneMeetingRequestDto requestDto);

    List<OneOnOneMeetingResponseDto> getAllOneOnOneMeetings();

    OneOnOneMeetingResponseDto getOneOnOneMeetingById(Integer id);

    OneOnOneMeetingResponseDto updateOneOnOneMeeting(Integer id, OneOnOneMeetingRequestDto requestDto);

    void deleteOneOnOneMeeting(Integer id);
}
