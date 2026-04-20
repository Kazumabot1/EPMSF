package com.epms.service.impl;

import com.epms.dto.KpiRequestDto;
import com.epms.dto.KpiResponseDto;
import com.epms.entity.Kpi;
import com.epms.entity.KpiCategory;
import com.epms.entity.KpiItem;
import com.epms.entity.KpiUnit;
import com.epms.entity.User;
import com.epms.exception.DuplicateResourceException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.KpiCategoryRepository;
import com.epms.repository.KpiItemRepository;
import com.epms.repository.KpiRepository;
import com.epms.repository.KpiUnitRepository;
import com.epms.repository.UserRepository;
import com.epms.service.KpiService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class KpiServiceImpl implements KpiService {

    private final KpiRepository kpiRepository;
    private final KpiUnitRepository kpiUnitRepository;
    private final KpiCategoryRepository kpiCategoryRepository;
    private final KpiItemRepository kpiItemRepository;
    private final UserRepository userRepository;

    @Override
    public KpiResponseDto create(KpiRequestDto dto) {
        String normalizedTitle = dto.getTitle().trim();
        if (kpiRepository.existsByTitle(normalizedTitle)) {
            throw new DuplicateResourceException("KPI already exists with title: " + normalizedTitle);
        }

        KpiUnit kpiUnit = getKpiUnitById(dto.getKpiUnitId());
        KpiCategory kpiCategory = getKpiCategoryById(dto.getKpiCategoryId());
        KpiItem kpiItem = getKpiItemById(dto.getKpiItemId());
        User createdByUser = getUserIfProvided(dto.getCreatedByUserId(), "createdByUser");
        User updatedByUser = getUserIfProvided(dto.getUpdatedByUserId(), "updatedByUser");

        Date now = new Date();

        Kpi kpi = new Kpi();
        kpi.setTitle(normalizedTitle);
        kpi.setTarget(dto.getTarget());
        kpi.setKpiUnit(kpiUnit);
        kpi.setWeight(dto.getWeight());
        kpi.setKpiCategory(kpiCategory);
        kpi.setKpiItem(kpiItem);
        kpi.setCreatedBy(dto.getCreatedBy().trim());
        kpi.setCreatedByUser(createdByUser);
        kpi.setUpdatedByUser(updatedByUser);
        kpi.setCreatedAt(now);
        kpi.setUpdatedAt(now);
        kpi.setVersion(kpi.getVersion() == null ? 1 : kpi.getVersion());

        Kpi saved = kpiRepository.save(kpi);
        Kpi savedWithRelations = kpiRepository.findWithRelationsById(saved.getId()).orElse(saved);
        return mapToResponseDto(savedWithRelations);
    }

    @Override
    @Transactional(readOnly = true)
    public List<KpiResponseDto> getAll() {
        return kpiRepository.findAllBy()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public KpiResponseDto getById(Integer id) {
        Kpi kpi = getKpiByIdWithRelations(id);
        return mapToResponseDto(kpi);
    }

    @Override
    public KpiResponseDto update(Integer id, KpiRequestDto dto) {
        Kpi existing = getKpiById(id);
        String normalizedTitle = dto.getTitle().trim();

        if (!normalizedTitle.equals(existing.getTitle()) && kpiRepository.existsByTitle(normalizedTitle)) {
            throw new DuplicateResourceException("KPI already exists with title: " + normalizedTitle);
        }

        KpiUnit kpiUnit = getKpiUnitById(dto.getKpiUnitId());
        KpiCategory kpiCategory = getKpiCategoryById(dto.getKpiCategoryId());
        KpiItem kpiItem = getKpiItemById(dto.getKpiItemId());
        User createdByUser = getUserIfProvided(dto.getCreatedByUserId(), "createdByUser");
        User updatedByUser = getUserIfProvided(dto.getUpdatedByUserId(), "updatedByUser");

        existing.setTitle(normalizedTitle);
        existing.setTarget(dto.getTarget());
        existing.setKpiUnit(kpiUnit);
        existing.setWeight(dto.getWeight());
        existing.setKpiCategory(kpiCategory);
        existing.setKpiItem(kpiItem);
        existing.setCreatedBy(dto.getCreatedBy().trim());
        existing.setCreatedByUser(createdByUser);
        existing.setUpdatedByUser(updatedByUser);
        existing.setUpdatedAt(new Date());
        existing.setVersion(existing.getVersion() == null ? 1 : existing.getVersion() + 1);

        Kpi updated = kpiRepository.save(existing);
        Kpi updatedWithRelations = kpiRepository.findWithRelationsById(updated.getId()).orElse(updated);
        return mapToResponseDto(updatedWithRelations);
    }

    @Override
    public void delete(Integer id) {
        Kpi existing = getKpiById(id);
        kpiRepository.delete(existing);
    }

    private Kpi getKpiById(Integer id) {
        return kpiRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("KPI not found with id: " + id));
    }

    private Kpi getKpiByIdWithRelations(Integer id) {
        return kpiRepository.findWithRelationsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("KPI not found with id: " + id));
    }

    private KpiUnit getKpiUnitById(Integer id) {
        return kpiUnitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("KPI unit not found with id: " + id));
    }

    private KpiCategory getKpiCategoryById(Integer id) {
        return kpiCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("KPI category not found with id: " + id));
    }

    private KpiItem getKpiItemById(Integer id) {
        return kpiItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("KPI item not found with id: " + id));
    }

    private User getUserIfProvided(Integer userId, String fieldName) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found for " + fieldName + " id: " + userId));
    }

    private KpiResponseDto mapToResponseDto(Kpi kpi) {
        KpiResponseDto dto = new KpiResponseDto();
        dto.setId(kpi.getId());
        dto.setTitle(kpi.getTitle());
        dto.setTarget(kpi.getTarget());
        dto.setWeight(kpi.getWeight());
        dto.setVersion(kpi.getVersion());
        dto.setCreatedAt(kpi.getCreatedAt());
        dto.setUpdatedAt(kpi.getUpdatedAt());
        dto.setCreatedBy(kpi.getCreatedBy());

        if (kpi.getKpiUnit() != null) {
            dto.setKpiUnitId(kpi.getKpiUnit().getId());
            dto.setKpiUnitName(kpi.getKpiUnit().getName());
        }

        if (kpi.getKpiCategory() != null) {
            dto.setKpiCategoryId(kpi.getKpiCategory().getId());
            dto.setKpiCategoryName(kpi.getKpiCategory().getName());
        }

        if (kpi.getKpiItem() != null) {
            dto.setKpiItemId(kpi.getKpiItem().getId());
            dto.setKpiItemName(kpi.getKpiItem().getName());
        }

        return dto;
    }
}
