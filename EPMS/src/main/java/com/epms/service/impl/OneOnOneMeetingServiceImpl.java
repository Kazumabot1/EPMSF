package com.epms.service.impl;

import com.epms.dto.OneOnOneMeetingRequestDto;
import com.epms.dto.OneOnOneMeetingResponseDto;
import com.epms.entity.OneOnOneMeeting;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.OneOnOneMeetingRepository;
import com.epms.service.OneOnOneMeetingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OneOnOneMeetingServiceImpl implements OneOnOneMeetingService {

    private final OneOnOneMeetingRepository oneOnOneMeetingRepository;

    @Override
    public OneOnOneMeetingResponseDto createOneOnOneMeeting(OneOnOneMeetingRequestDto requestDto) {
        OneOnOneMeeting oneOnOneMeeting = new OneOnOneMeeting();
        oneOnOneMeeting.setManagerId(requestDto.getManagerId());
        oneOnOneMeeting.setEmployeeId(requestDto.getEmployeeId());
        oneOnOneMeeting.setScheduledDate(requestDto.getScheduledDate());
        oneOnOneMeeting.setNotes(requestDto.getNotes() != null ? requestDto.getNotes().trim() : null);
        oneOnOneMeeting.setStatus(requestDto.getStatus());
        oneOnOneMeeting.setFollowUpDate(requestDto.getFollowUpDate());
        oneOnOneMeeting.setIsFinalized(requestDto.getIsFinalized() != null ? requestDto.getIsFinalized() : false);
        oneOnOneMeeting.setCreatedAt(new Date());
        oneOnOneMeeting.setUpdatedAt(null);

        OneOnOneMeeting savedOneOnOneMeeting = oneOnOneMeetingRepository.save(oneOnOneMeeting);
        return mapToResponseDto(savedOneOnOneMeeting);
    }

    @Override
    public List<OneOnOneMeetingResponseDto> getAllOneOnOneMeetings() {
        return oneOnOneMeetingRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    public OneOnOneMeetingResponseDto getOneOnOneMeetingById(Integer id) {
        OneOnOneMeeting oneOnOneMeeting = getOneOnOneMeetingEntityById(id);
        return mapToResponseDto(oneOnOneMeeting);
    }

    @Override
    public OneOnOneMeetingResponseDto updateOneOnOneMeeting(Integer id, OneOnOneMeetingRequestDto requestDto) {
        OneOnOneMeeting existingOneOnOneMeeting = getOneOnOneMeetingEntityById(id);
        existingOneOnOneMeeting.setManagerId(requestDto.getManagerId());
        existingOneOnOneMeeting.setEmployeeId(requestDto.getEmployeeId());
        existingOneOnOneMeeting.setScheduledDate(requestDto.getScheduledDate());
        existingOneOnOneMeeting.setNotes(requestDto.getNotes() != null ? requestDto.getNotes().trim() : null);
        existingOneOnOneMeeting.setStatus(requestDto.getStatus());
        existingOneOnOneMeeting.setFollowUpDate(requestDto.getFollowUpDate());
        existingOneOnOneMeeting.setIsFinalized(requestDto.getIsFinalized() != null ? requestDto.getIsFinalized() : existingOneOnOneMeeting.getIsFinalized());
        existingOneOnOneMeeting.setUpdatedAt(new Date());

        OneOnOneMeeting updatedOneOnOneMeeting = oneOnOneMeetingRepository.save(existingOneOnOneMeeting);
        return mapToResponseDto(updatedOneOnOneMeeting);
    }

    @Override
    public void deleteOneOnOneMeeting(Integer id) {
        OneOnOneMeeting existingOneOnOneMeeting = getOneOnOneMeetingEntityById(id);
        oneOnOneMeetingRepository.delete(existingOneOnOneMeeting);
    }

    private OneOnOneMeeting getOneOnOneMeetingEntityById(Integer id) {
        return oneOnOneMeetingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OneOnOneMeeting not found with id: " + id));
    }

    private OneOnOneMeetingResponseDto mapToResponseDto(OneOnOneMeeting oneOnOneMeeting) {
        return new OneOnOneMeetingResponseDto(
                oneOnOneMeeting.getId(),
                oneOnOneMeeting.getManagerId(),
                oneOnOneMeeting.getEmployeeId(),
                oneOnOneMeeting.getScheduledDate(),
                oneOnOneMeeting.getNotes(),
                oneOnOneMeeting.getStatus(),
                oneOnOneMeeting.getFollowUpDate(),
                oneOnOneMeeting.getIsFinalized(),
                oneOnOneMeeting.getCreatedAt(),
                oneOnOneMeeting.getUpdatedAt()
        );
    }
}
