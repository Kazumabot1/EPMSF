package com.epms.service.impl;

import com.epms.dto.KpiItemRequestDto;
import com.epms.dto.KpiItemResponseDto;
import com.epms.entity.KpiCategory;
import com.epms.entity.KpiItem;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.KpiCategoryRepository;
import com.epms.repository.KpiItemRepository;
import com.epms.service.KpiItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class KpiItemServiceImpl implements KpiItemService {

    private final KpiItemRepository kpiItemRepository;
    private final KpiCategoryRepository kpiCategoryRepository;

    @Override
    public KpiItemResponseDto createKpiItem(KpiItemRequestDto requestDto) {
        KpiCategory kpiCategory = getKpiCategoryById(requestDto.getKpiCategoryId());

        KpiItem kpiItem = new KpiItem();
        kpiItem.setName(requestDto.getName().trim());
        kpiItem.setKpiCategory(kpiCategory);

        KpiItem savedKpiItem = kpiItemRepository.save(kpiItem);
        return mapToResponseDto(savedKpiItem);
    }

    @Override
    public List<KpiItemResponseDto> getAllKpiItems() {
        return kpiItemRepository.findAllBy()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    public KpiItemResponseDto getKpiItemById(Integer id) {
        KpiItem kpiItem = getKpiItemEntityById(id);
        return mapToResponseDto(kpiItem);
    }

    @Override
    public KpiItemResponseDto updateKpiItem(Integer id, KpiItemRequestDto requestDto) {
        KpiItem existingKpiItem = getKpiItemEntityById(id);
        KpiCategory kpiCategory = getKpiCategoryById(requestDto.getKpiCategoryId());

        existingKpiItem.setName(requestDto.getName().trim());
        existingKpiItem.setKpiCategory(kpiCategory);

        KpiItem updatedKpiItem = kpiItemRepository.save(existingKpiItem);
        return mapToResponseDto(updatedKpiItem);
    }

    @Override
    public void deleteKpiItem(Integer id) {
        KpiItem existingKpiItem = getKpiItemEntityById(id);
        kpiItemRepository.delete(existingKpiItem);
    }

    private KpiItem getKpiItemEntityById(Integer id) {
        return kpiItemRepository.findWithKpiCategoryById(id)
                .orElseThrow(() -> new ResourceNotFoundException("KPI item not found with id: " + id));
    }

    private KpiCategory getKpiCategoryById(Integer categoryId) {
        return kpiCategoryRepository.findById(categoryId)
                .orElseThrow(() -> new BadRequestException("KPI category does not exist with id: " + categoryId));
    }

    private KpiItemResponseDto mapToResponseDto(KpiItem kpiItem) {
        KpiCategory category = kpiItem.getKpiCategory();

        return new KpiItemResponseDto(
                kpiItem.getId(),
                kpiItem.getName(),
                category.getId(),
                category.getName()
        );
    }
}
