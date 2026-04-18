package com.epms.service.impl;

import com.epms.dto.PositionRequestDto;
import com.epms.dto.PositionResponseDto;
import com.epms.entity.Position;
import com.epms.entity.PositionLevel;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.PositionLevelRepository;
import com.epms.repository.PositionRepository;
import com.epms.service.PositionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PositionServiceImpl implements PositionService {

    private final PositionRepository positionRepository;
    private final PositionLevelRepository positionLevelRepository;

    @Override
    @Transactional
    public PositionResponseDto create(PositionRequestDto dto) {
        PositionLevel level = getLevelById(dto.getLevelId());

        Position position = new Position();
        position.setPositionTitle(normalizeText(dto.getPositionTitle()));
        position.setLevel(level);
        position.setDescription(normalizeText(dto.getDescription()));
        position.setStatus(dto.getStatus() != null ? dto.getStatus() : Boolean.TRUE);
        position.setCreatedBy(normalizeText(dto.getCreatedBy()));
        position.setCreatedAt(new Date());

        Position savedPosition = positionRepository.save(position);
        return mapToResponseDto(savedPosition);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PositionResponseDto> getAll() {
        return positionRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PositionResponseDto getById(Integer id) {
        Position position = getPositionById(id);
        return mapToResponseDto(position);
    }

    @Override
    @Transactional
    public PositionResponseDto update(Integer id, PositionRequestDto dto) {
        Position existingPosition = getPositionById(id);
        PositionLevel level = getLevelById(dto.getLevelId());

        existingPosition.setPositionTitle(normalizeText(dto.getPositionTitle()));
        existingPosition.setLevel(level);
        existingPosition.setDescription(normalizeText(dto.getDescription()));
        existingPosition.setStatus(dto.getStatus() != null ? dto.getStatus() : existingPosition.getStatus());

        Position updatedPosition = positionRepository.save(existingPosition);
        return mapToResponseDto(updatedPosition);
    }

    @Override
    @Transactional
    public void delete(Integer id) {
        Position existingPosition = getPositionById(id);
        positionRepository.delete(existingPosition);
    }

    private Position getPositionById(Integer id) {
        return positionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Position not found with id: " + id));
    }

    private PositionLevel getLevelById(Integer levelId) {
        if (levelId == null) {
            throw new BadRequestException("Level id must not be null");
        }

        return positionLevelRepository.findById(levelId)
                .orElseThrow(() -> new ResourceNotFoundException("Position level not found with id: " + levelId));
    }

    private PositionResponseDto mapToResponseDto(Position position) {
        PositionLevel level = position.getLevel();

        Integer levelId = level != null ? level.getId() : null;
        String levelCode = level != null ? level.getLevelCode() : null;

        return new PositionResponseDto(
                position.getId(),
                position.getPositionTitle(),
                levelId,
                levelCode,
                position.getDescription(),
                position.getStatus(),
                position.getCreatedAt(),
                position.getCreatedBy()
        );
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
