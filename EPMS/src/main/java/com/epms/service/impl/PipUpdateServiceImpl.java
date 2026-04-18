package com.epms.service.impl;

import com.epms.dto.PipUpdateRequestDto;
import com.epms.dto.PipUpdateResponseDto;
import com.epms.entity.PipUpdate;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.PipUpdateRepository;
import com.epms.service.PipUpdateService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PipUpdateServiceImpl implements PipUpdateService {

    private final PipUpdateRepository pipUpdateRepository;

    @Override
    public PipUpdateResponseDto createPipUpdate(PipUpdateRequestDto requestDto) {
        PipUpdate pipUpdate = new PipUpdate();
        pipUpdate.setPipId(requestDto.getPipId());
        pipUpdate.setComments(requestDto.getComments() != null ? requestDto.getComments().trim() : null);
        pipUpdate.setStatus(requestDto.getStatus());
        pipUpdate.setUpdatedBy(requestDto.getUpdatedBy());
        pipUpdate.setUpdatedAt(new Date());

        PipUpdate savedPipUpdate = pipUpdateRepository.save(pipUpdate);
        return mapToResponseDto(savedPipUpdate);
    }

    @Override
    public List<PipUpdateResponseDto> getAllPipUpdates() {
        return pipUpdateRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    public PipUpdateResponseDto getPipUpdateById(Integer id) {
        PipUpdate pipUpdate = getPipUpdateEntityById(id);
        return mapToResponseDto(pipUpdate);
    }

    @Override
    public PipUpdateResponseDto updatePipUpdate(Integer id, PipUpdateRequestDto requestDto) {
        PipUpdate existingPipUpdate = getPipUpdateEntityById(id);
        existingPipUpdate.setPipId(requestDto.getPipId());
        existingPipUpdate.setComments(requestDto.getComments() != null ? requestDto.getComments().trim() : null);
        existingPipUpdate.setStatus(requestDto.getStatus());
        existingPipUpdate.setUpdatedBy(requestDto.getUpdatedBy());
        existingPipUpdate.setUpdatedAt(new Date());

        PipUpdate updatedPipUpdate = pipUpdateRepository.save(existingPipUpdate);
        return mapToResponseDto(updatedPipUpdate);
    }

    @Override
    public void deletePipUpdate(Integer id) {
        PipUpdate existingPipUpdate = getPipUpdateEntityById(id);
        pipUpdateRepository.delete(existingPipUpdate);
    }

    private PipUpdate getPipUpdateEntityById(Integer id) {
        return pipUpdateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PipUpdate not found with id: " + id));
    }

    private PipUpdateResponseDto mapToResponseDto(PipUpdate pipUpdate) {
        return new PipUpdateResponseDto(
                pipUpdate.getId(),
                pipUpdate.getPipId(),
                pipUpdate.getComments(),
                pipUpdate.getStatus(),
                pipUpdate.getUpdatedBy(),
                pipUpdate.getUpdatedAt()
        );
    }
}
