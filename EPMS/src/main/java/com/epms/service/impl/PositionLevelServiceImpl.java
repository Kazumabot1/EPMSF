package com.epms.service.impl;

import com.epms.dto.PositionLevelRequestDto;
import com.epms.dto.PositionLevelResponseDto;
import com.epms.entity.PositionLevel;
import com.epms.exception.DuplicateResourceException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.PositionLevelRepository;
import com.epms.service.PositionLevelService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PositionLevelServiceImpl implements PositionLevelService {

    private final PositionLevelRepository positionLevelRepository;

    @Override
    public PositionLevelResponseDto create(PositionLevelRequestDto dto) {
        String normalizedLevelCode = normalizeLevelCode(dto.getLevelCode());

        if (positionLevelRepository.existsByLevelCode(normalizedLevelCode)) {
            throw new DuplicateResourceException("Position level already exists with levelCode: " + normalizedLevelCode);
        }

        PositionLevel positionLevel = new PositionLevel();
        positionLevel.setLevelCode(normalizedLevelCode);

        PositionLevel savedPositionLevel = positionLevelRepository.save(positionLevel);
        return mapToResponseDto(savedPositionLevel);
    }

    @Override
    public List<PositionLevelResponseDto> getAll() {
        return positionLevelRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    public PositionLevelResponseDto getById(Integer id) {
        PositionLevel positionLevel = getEntityById(id);
        return mapToResponseDto(positionLevel);
    }

    @Override
    public PositionLevelResponseDto update(Integer id, PositionLevelRequestDto dto) {
        PositionLevel existingPositionLevel = getEntityById(id);
        String normalizedLevelCode = normalizeLevelCode(dto.getLevelCode());

        positionLevelRepository.findByLevelCode(normalizedLevelCode)
                .filter(positionLevel -> !positionLevel.getId().equals(id))
                .ifPresent(positionLevel -> {
                    throw new DuplicateResourceException(
                            "Position level already exists with levelCode: " + normalizedLevelCode
                    );
                });

        existingPositionLevel.setLevelCode(normalizedLevelCode);
        PositionLevel updatedPositionLevel = positionLevelRepository.save(existingPositionLevel);
        return mapToResponseDto(updatedPositionLevel);
    }

    @Override
    public void delete(Integer id) {
        PositionLevel existingPositionLevel = getEntityById(id);
        positionLevelRepository.delete(existingPositionLevel);
    }

    private PositionLevel getEntityById(Integer id) {
        return positionLevelRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Position level not found with id: " + id));
    }

    private PositionLevelResponseDto mapToResponseDto(PositionLevel positionLevel) {
        return new PositionLevelResponseDto(
                positionLevel.getId(),
                positionLevel.getLevelCode()
        );
    }

    private String normalizeLevelCode(String levelCode) {
        return levelCode == null ? null : levelCode.trim();
    }
}
