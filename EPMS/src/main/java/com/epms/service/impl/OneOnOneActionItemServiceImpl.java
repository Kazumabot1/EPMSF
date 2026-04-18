package com.epms.service.impl;

import com.epms.dto.OneOnOneActionItemRequestDto;
import com.epms.dto.OneOnOneActionItemResponseDto;
import com.epms.entity.OneOnOneActionItem;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.OneOnOneActionItemRepository;
import com.epms.service.OneOnOneActionItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OneOnOneActionItemServiceImpl implements OneOnOneActionItemService {

    private final OneOnOneActionItemRepository oneOnOneActionItemRepository;

    @Override
    public OneOnOneActionItemResponseDto createOneOnOneActionItem(OneOnOneActionItemRequestDto requestDto) {
        OneOnOneActionItem oneOnOneActionItem = new OneOnOneActionItem();
        oneOnOneActionItem.setMeetingId(requestDto.getMeetingId());
        oneOnOneActionItem.setDescription(requestDto.getDescription().trim());
        oneOnOneActionItem.setOwner(requestDto.getOwner() != null ? requestDto.getOwner().trim() : null);
        oneOnOneActionItem.setDueDate(requestDto.getDueDate());
        oneOnOneActionItem.setStatus(requestDto.getStatus());
        oneOnOneActionItem.setCreatedAt(new Date());

        OneOnOneActionItem savedOneOnOneActionItem = oneOnOneActionItemRepository.save(oneOnOneActionItem);
        return mapToResponseDto(savedOneOnOneActionItem);
    }

    @Override
    public List<OneOnOneActionItemResponseDto> getAllOneOnOneActionItems() {
        return oneOnOneActionItemRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    public OneOnOneActionItemResponseDto getOneOnOneActionItemById(Integer id) {
        OneOnOneActionItem oneOnOneActionItem = getOneOnOneActionItemEntityById(id);
        return mapToResponseDto(oneOnOneActionItem);
    }

    @Override
    public OneOnOneActionItemResponseDto updateOneOnOneActionItem(Integer id, OneOnOneActionItemRequestDto requestDto) {
        OneOnOneActionItem existingOneOnOneActionItem = getOneOnOneActionItemEntityById(id);
        existingOneOnOneActionItem.setMeetingId(requestDto.getMeetingId());
        existingOneOnOneActionItem.setDescription(requestDto.getDescription().trim());
        existingOneOnOneActionItem.setOwner(requestDto.getOwner() != null ? requestDto.getOwner().trim() : null);
        existingOneOnOneActionItem.setDueDate(requestDto.getDueDate());
        existingOneOnOneActionItem.setStatus(requestDto.getStatus());

        OneOnOneActionItem updatedOneOnOneActionItem = oneOnOneActionItemRepository.save(existingOneOnOneActionItem);
        return mapToResponseDto(updatedOneOnOneActionItem);
    }

    @Override
    public void deleteOneOnOneActionItem(Integer id) {
        OneOnOneActionItem existingOneOnOneActionItem = getOneOnOneActionItemEntityById(id);
        oneOnOneActionItemRepository.delete(existingOneOnOneActionItem);
    }

    private OneOnOneActionItem getOneOnOneActionItemEntityById(Integer id) {
        return oneOnOneActionItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OneOnOneActionItem not found with id: " + id));
    }

    private OneOnOneActionItemResponseDto mapToResponseDto(OneOnOneActionItem oneOnOneActionItem) {
        return new OneOnOneActionItemResponseDto(
                oneOnOneActionItem.getId(),
                oneOnOneActionItem.getMeetingId(),
                oneOnOneActionItem.getDescription(),
                oneOnOneActionItem.getOwner(),
                oneOnOneActionItem.getDueDate(),
                oneOnOneActionItem.getStatus(),
                oneOnOneActionItem.getCreatedAt()
        );
    }
}
