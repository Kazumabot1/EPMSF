package com.epms.service.impl;

import com.epms.dto.OneOnOneActionItemRequestDto;
import com.epms.dto.OneOnOneActionItemResponseDto;
import com.epms.entity.OneOnOneActionItem;
import com.epms.entity.OneOnOneMeeting;
import com.epms.repository.OneOnOneActionItemRepository;
import com.epms.repository.OneOnOneMeetingRepository;
import com.epms.service.OneOnOneActionItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class OneOnOneActionItemServiceImpl implements OneOnOneActionItemService {

    private final OneOnOneActionItemRepository actionItemRepo;
    private final OneOnOneMeetingRepository meetingRepo;

    @Override
    @Transactional
    public OneOnOneActionItemResponseDto saveActionItem(OneOnOneActionItemRequestDto request) {
        OneOnOneMeeting meeting = meetingRepo.findById(request.getMeetingId())
                .orElseThrow(() -> new RuntimeException("Meeting not found: " + request.getMeetingId()));

        // Upsert: update if already exists, create if not
        OneOnOneActionItem item = actionItemRepo.findByMeetingId(request.getMeetingId())
                .orElse(new OneOnOneActionItem());

        item.setMeeting(meeting);
        item.setDescription(request.getDescription());
        item.setUpdatedAt(LocalDateTime.now());

        return toDto(actionItemRepo.save(item));
    }

    @Override
    public Optional<OneOnOneActionItemResponseDto> getByMeetingId(Integer meetingId) {
        return actionItemRepo.findByMeetingId(meetingId).map(this::toDto);
    }

    private OneOnOneActionItemResponseDto toDto(OneOnOneActionItem item) {
        OneOnOneActionItemResponseDto dto = new OneOnOneActionItemResponseDto();
        dto.setId(item.getId());
        dto.setMeetingId(item.getMeeting() != null ? item.getMeeting().getId() : null);
        dto.setDescription(item.getDescription());
        dto.setUpdatedAt(item.getUpdatedAt());
        return dto;
    }
}
