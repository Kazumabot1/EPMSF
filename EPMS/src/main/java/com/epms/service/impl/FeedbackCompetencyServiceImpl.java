package com.epms.service.impl;

import com.epms.dto.FeedbackCompetencyResponse;
import com.epms.dto.FeedbackCompetencyUpsertRequest;
import com.epms.entity.FeedbackCompetency;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.FeedbackCompetencyRepository;
import com.epms.service.FeedbackCompetencyService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class FeedbackCompetencyServiceImpl implements FeedbackCompetencyService {

    private static final String DEFAULT_CATEGORY = "PERFORMANCE_360";

    private static final List<SeedCompetency> DEFAULT_COMPETENCIES = List.of(
            new SeedCompetency("COMMUNICATION_SKILLS", "Communication Skills", "Measures how clearly, respectfully, and effectively employees share information and listen to others.", 10),
            new SeedCompetency("TEAMWORK_COLLABORATION", "Teamwork & Collaboration", "Measures how effectively employees work with others toward shared outcomes.", 20),
            new SeedCompetency("TECHNICAL_SKILLS", "Technical Skills", "Measures role-specific knowledge, technical capability, and effective application of skills.", 30),
            new SeedCompetency("WORK_QUALITY", "Work Quality", "Measures accuracy, consistency, and quality of delivered work.", 40),
            new SeedCompetency("ACCOUNTABILITY_RESPONSIBILITY", "Accountability & Responsibility", "Measures ownership of assigned work, follow-through, and responsibility for outcomes.", 50),
            new SeedCompetency("PROBLEM_SOLVING", "Problem Solving", "Measures how employees analyze issues and propose practical solutions.", 60),
            new SeedCompetency("LEARNING_IMPROVEMENT", "Learning & Improvement", "Measures willingness to learn, improve, and adapt based on feedback and changing needs.", 70),
            new SeedCompetency("ATTITUDE_PROFESSIONALISM", "Attitude & Professionalism", "Measures professional conduct, respect, reliability, and positive workplace behavior.", 80)
    );

    private final FeedbackCompetencyRepository competencyRepository;

    @Override
    @Transactional
    public List<FeedbackCompetencyResponse> getCompetencies() {
        ensureDefaultAndReferencedCompetencies();
        return competencyRepository.findAllOrdered().stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public FeedbackCompetencyResponse createCompetency(FeedbackCompetencyUpsertRequest request) {
        String code = request.getCode() == null || request.getCode().isBlank()
                ? generateUniqueCode(request.getName())
                : normalizeCode(request.getCode(), "Competency code is required.");
        if (competencyRepository.existsByCodeIgnoreCase(code)) {
            throw new BadRequestException("A competency with code " + code + " already exists.");
        }
        FeedbackCompetency competency = new FeedbackCompetency();
        competency.setCode(code);
        competency.setDisplayOrder(resolveNextDisplayOrder());
        applyEditableFields(competency, request);
        applyInternalDefaults(competency);
        return toResponse(competencyRepository.save(competency));
    }

    @Override
    @Transactional
    public FeedbackCompetencyResponse updateCompetency(Long competencyId, FeedbackCompetencyUpsertRequest request) {
        FeedbackCompetency competency = competencyRepository.findById(competencyId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback competency not found."));
        String newCode = request.getCode() == null || request.getCode().isBlank()
                ? competency.getCode()
                : normalizeCode(request.getCode(), "Competency code is required.");
        competencyRepository.findByCodeIgnoreCase(newCode)
                .filter(existing -> !Objects.equals(existing.getId(), competency.getId()))
                .ifPresent(existing -> {
                    throw new BadRequestException("A competency with code " + newCode + " already exists.");
                });
        competency.setCode(newCode);
        applyEditableFields(competency, request);
        applyInternalDefaults(competency);
        return toResponse(competencyRepository.save(competency));
    }

    private void ensureDefaultAndReferencedCompetencies() {
        DEFAULT_COMPETENCIES.forEach(seed -> {
            FeedbackCompetency competency = competencyRepository.findByCodeIgnoreCase(seed.code()).orElseGet(() -> {
                FeedbackCompetency created = new FeedbackCompetency();
                created.setCode(seed.code());
                created.setName(seed.name());
                created.setDescription(seed.description());
                created.setDisplayOrder(seed.displayOrder());
                return created;
            });
            if (competency.getName() == null || competency.getName().isBlank()) {
                competency.setName(seed.name());
            }
            if (competency.getDescription() == null || competency.getDescription().isBlank()) {
                competency.setDescription(seed.description());
            }
            if (competency.getDisplayOrder() == null || competency.getDisplayOrder() >= 500) {
                competency.setDisplayOrder(seed.displayOrder());
            }
            applyInternalDefaults(competency);
            competencyRepository.save(competency);
        });

        for (String rawCode : competencyRepository.findDistinctQuestionCompetencyCodes()) {
            String code = normalizeCode(rawCode, "Competency code is required.");
            if (competencyRepository.existsByCodeIgnoreCase(code)) {
                continue;
            }
            FeedbackCompetency legacyCompetency = new FeedbackCompetency();
            legacyCompetency.setCode(code);
            legacyCompetency.setName(humanizeCode(code));
            legacyCompetency.setDisplayOrder(resolveNextDisplayOrder());
            applyInternalDefaults(legacyCompetency);
            competencyRepository.save(legacyCompetency);
        }
    }

    private void applyEditableFields(FeedbackCompetency competency, FeedbackCompetencyUpsertRequest request) {
        competency.setName(requireText(request.getName(), "Competency name is required."));
        competency.setDescription(blankToNull(request.getDescription()));
    }

    private void applyInternalDefaults(FeedbackCompetency competency) {
        if (competency.getCategory() == null || competency.getCategory().isBlank()) {
            competency.setCategory(DEFAULT_CATEGORY);
        }
        if (competency.getDefaultWeightPercent() == null || competency.getDefaultWeightPercent() < 0) {
            competency.setDefaultWeightPercent(0.0);
        }
        if (competency.getDisplayOrder() == null) {
            competency.setDisplayOrder(resolveNextDisplayOrder());
        }
        competency.setStatus("ACTIVE");
    }

    private FeedbackCompetencyResponse toResponse(FeedbackCompetency competency) {
        long questionCount = competencyRepository.countQuestionsByCompetencyCode(competency.getCode());
        long activeQuestionCount = competencyRepository.countActiveQuestionsByCompetencyCode(competency.getCode());
        return FeedbackCompetencyResponse.builder()
                .id(competency.getId())
                .code(competency.getCode())
                .name(competency.getName())
                .description(competency.getDescription())
                .category(competency.getCategory())
                .displayOrder(competency.getDisplayOrder())
                .status(competency.getStatus())
                .questionCount(questionCount)
                .activeQuestionCount(activeQuestionCount)
                .createdAt(competency.getCreatedAt())
                .updatedAt(competency.getUpdatedAt())
                .build();
    }

    private String generateUniqueCode(String name) {
        String baseCode = normalizeCode(name, "Competency name is required.");
        String candidate = baseCode;
        int suffix = 2;
        while (competencyRepository.existsByCodeIgnoreCase(candidate)) {
            candidate = baseCode + "_" + suffix;
            suffix++;
        }
        return candidate;
    }

    private Integer resolveNextDisplayOrder() {
        Integer value = competencyRepository.nextDisplayOrder();
        return value == null || value <= 0 ? 100 : value;
    }

    private String normalizeCode(String value, String message) {
        return requireText(value, message)
                .trim()
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase(Locale.ROOT);
    }

    private String humanizeCode(String code) {
        String normalized = code == null ? "Competency" : code.trim().replace('_', ' ').replace('-', ' ').toLowerCase(Locale.ROOT);
        String[] parts = normalized.split("\\s+");
        StringBuilder builder = new StringBuilder();
        for (String part : parts) {
            if (part.isBlank()) {
                continue;
            }
            if (builder.length() > 0) {
                builder.append(' ');
            }
            builder.append(part.substring(0, 1).toUpperCase(Locale.ROOT));
            if (part.length() > 1) {
                builder.append(part.substring(1));
            }
        }
        return builder.length() == 0 ? "Competency" : builder.toString();
    }

    private String requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException(message);
        }
        return value.trim();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private record SeedCompetency(String code, String name, String description, int displayOrder) {}
}
