package com.epms.service.impl;

import com.epms.dto.KpiUnitRequestDto;
import com.epms.dto.KpiUnitResponseDto;
import com.epms.entity.KpiUnit;
import com.epms.exception.DuplicateResourceException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.KpiUnitRepository;
import com.epms.service.KpiUnitService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class KpiUnitServiceImpl implements KpiUnitService {

    private final KpiUnitRepository kpiUnitRepository;

    @Override
    public KpiUnitResponseDto create(KpiUnitRequestDto dto) {
        String normalizedName = dto.getName().trim();

        if (kpiUnitRepository.existsByName(normalizedName)) {
            throw new DuplicateResourceException("KPI unit already exists with name: " + normalizedName);
        }

        KpiUnit kpiUnit = new KpiUnit();
        kpiUnit.setName(normalizedName);

        KpiUnit savedKpiUnit = kpiUnitRepository.save(kpiUnit);
        return mapToResponseDto(savedKpiUnit);
    }

    @Override
    public List<KpiUnitResponseDto> getAll() {
        return kpiUnitRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    public KpiUnitResponseDto getById(Integer id) {
        KpiUnit kpiUnit = getEntityById(id);
        return mapToResponseDto(kpiUnit);
    }

    @Override
    public KpiUnitResponseDto update(Integer id, KpiUnitRequestDto dto) {
        KpiUnit existingKpiUnit = getEntityById(id);
        String normalizedName = dto.getName().trim();

        kpiUnitRepository.findByName(normalizedName)
                .filter(found -> !found.getId().equals(id))
                .ifPresent(found -> {
                    throw new DuplicateResourceException("KPI unit already exists with name: " + normalizedName);
                });

        existingKpiUnit.setName(normalizedName);
        KpiUnit updatedKpiUnit = kpiUnitRepository.save(existingKpiUnit);
        return mapToResponseDto(updatedKpiUnit);
    }

    @Override
    public void delete(Integer id) {
        KpiUnit existingKpiUnit = getEntityById(id);
        kpiUnitRepository.delete(existingKpiUnit);
    }

    private KpiUnit getEntityById(Integer id) {
        return kpiUnitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("KPI unit not found with id: " + id));
    }

    private KpiUnitResponseDto mapToResponseDto(KpiUnit kpiUnit) {
        return new KpiUnitResponseDto(kpiUnit.getId(), kpiUnit.getName());
    }
}
