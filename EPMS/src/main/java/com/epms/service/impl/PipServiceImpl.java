package com.epms.service.impl;

import com.epms.dto.PipRequestDto;
import com.epms.dto.PipResponseDto;
import com.epms.entity.Pip;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.PipRepository;
import com.epms.service.PipService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PipServiceImpl implements PipService {

    private final PipRepository pipRepository;

    @Override
    public PipResponseDto createPip(PipRequestDto requestDto) {
        Pip pip = new Pip();
        pip.setEmployeeId(requestDto.getEmployeeId());
        pip.setCreatedBy(requestDto.getCreatedBy());
        pip.setTitle(requestDto.getTitle().trim());
        pip.setObjectives(requestDto.getObjectives() != null ? requestDto.getObjectives().trim() : null);
        pip.setExpectedOutcomes(requestDto.getExpectedOutcomes() != null ? requestDto.getExpectedOutcomes().trim() : null);
        pip.setReviewDate(requestDto.getReviewDate());
        pip.setStatus(requestDto.getStatus());
        pip.setStartDate(requestDto.getStartDate());
        pip.setEndDate(requestDto.getEndDate());
        pip.setIsAcknowledged(requestDto.getIsAcknowledged() != null ? requestDto.getIsAcknowledged() : false);
        pip.setCreatedAt(new Date());
        pip.setUpdatedAt(null);

        Pip savedPip = pipRepository.save(pip);
        return mapToResponseDto(savedPip);
    }

    @Override
    public List<PipResponseDto> getAllPips() {
        return pipRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    public PipResponseDto getPipById(Integer id) {
        Pip pip = getPipEntityById(id);
        return mapToResponseDto(pip);
    }

    @Override
    public PipResponseDto updatePip(Integer id, PipRequestDto requestDto) {
        Pip existingPip = getPipEntityById(id);
        existingPip.setEmployeeId(requestDto.getEmployeeId());
        existingPip.setCreatedBy(requestDto.getCreatedBy());
        existingPip.setTitle(requestDto.getTitle().trim());
        existingPip.setObjectives(requestDto.getObjectives() != null ? requestDto.getObjectives().trim() : null);
        existingPip.setExpectedOutcomes(requestDto.getExpectedOutcomes() != null ? requestDto.getExpectedOutcomes().trim() : null);
        existingPip.setReviewDate(requestDto.getReviewDate());
        existingPip.setStatus(requestDto.getStatus());
        existingPip.setStartDate(requestDto.getStartDate());
        existingPip.setEndDate(requestDto.getEndDate());
        existingPip.setIsAcknowledged(requestDto.getIsAcknowledged() != null ? requestDto.getIsAcknowledged() : existingPip.getIsAcknowledged());
        existingPip.setUpdatedAt(new Date());

        Pip updatedPip = pipRepository.save(existingPip);
        return mapToResponseDto(updatedPip);
    }

    @Override
    public void deletePip(Integer id) {
        Pip existingPip = getPipEntityById(id);
        pipRepository.delete(existingPip);
    }

    private Pip getPipEntityById(Integer id) {
        return pipRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PIP not found with id: " + id));
    }

    private PipResponseDto mapToResponseDto(Pip pip) {
        return new PipResponseDto(
                pip.getId(),
                pip.getEmployeeId(),
                pip.getCreatedBy(),
                pip.getTitle(),
                pip.getObjectives(),
                pip.getExpectedOutcomes(),
                pip.getReviewDate(),
                pip.getStatus(),
                pip.getStartDate(),
                pip.getEndDate(),
                pip.getIsAcknowledged(),
                pip.getCreatedAt(),
                pip.getUpdatedAt()
        );
    }
}
