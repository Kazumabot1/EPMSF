package com.epms.service.impl;

import com.epms.dto.KpiCategoryRequestDto;
import com.epms.dto.KpiCategoryResponseDto;
import com.epms.entity.KpiCategory;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.KpiCategoryRepository;
import com.epms.service.KpiCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class KpiCategoryServiceImpl implements KpiCategoryService {

    private final KpiCategoryRepository kpiCategoryRepository;

    @Override
    public KpiCategoryResponseDto createKpiCategory(KpiCategoryRequestDto requestDto) {
        KpiCategory kpiCategory = new KpiCategory();
        kpiCategory.setName(requestDto.getName().trim());

        KpiCategory savedKpiCategory = kpiCategoryRepository.save(kpiCategory);
        return mapToResponseDto(savedKpiCategory);
    }

    @Override
    public List<KpiCategoryResponseDto> getAllKpiCategories() {
        return kpiCategoryRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    public KpiCategoryResponseDto getKpiCategoryById(Integer id) {
        KpiCategory kpiCategory = getKpiCategoryEntityById(id);
        return mapToResponseDto(kpiCategory);
    }

    @Override
    public KpiCategoryResponseDto updateKpiCategory(Integer id, KpiCategoryRequestDto requestDto) {
        KpiCategory existingKpiCategory = getKpiCategoryEntityById(id);
        existingKpiCategory.setName(requestDto.getName().trim());

        KpiCategory updatedKpiCategory = kpiCategoryRepository.save(existingKpiCategory);
        return mapToResponseDto(updatedKpiCategory);
    }

    @Override
    public void deleteKpiCategory(Integer id) {
        KpiCategory existingKpiCategory = getKpiCategoryEntityById(id);
        kpiCategoryRepository.delete(existingKpiCategory);
    }

    private KpiCategory getKpiCategoryEntityById(Integer id) {
        return kpiCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("KPI category not found with id: " + id));
    }

    private KpiCategoryResponseDto mapToResponseDto(KpiCategory kpiCategory) {
        return new KpiCategoryResponseDto(
                kpiCategory.getId(),
                kpiCategory.getName()
        );
    }
}
