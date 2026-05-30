package com.epms.service.impl;

import com.epms.dto.SignatureCreateRequest;
import com.epms.dto.SignatureResponse;
import com.epms.dto.SignatureUpdateRequest;
import com.epms.entity.Signature;
import com.epms.entity.enums.SignatureRole;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.exception.UnauthorizedActionException;
import com.epms.repository.SignatureRepository;
import com.epms.security.SecurityUtils;
import com.epms.security.UserPrincipal;
import com.epms.service.SignatureService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SignatureServiceImpl implements SignatureService {

    private static final int MAX_BASE64_LENGTH = 2_000_000;
    private static final List<String> ALLOWED_IMAGE_TYPES = List.of("image/png", "image/jpg", "image/jpeg");

    private final SignatureRepository signatureRepository;

    @Override
    @Transactional
    public SignatureResponse createSignature(SignatureCreateRequest request, Long requestedUserId) {
        UserPrincipal principal = SecurityUtils.currentUser();
        Long currentUserId = Long.valueOf(principal.getId());

        validateSelfOnly(currentUserId, requestedUserId);
        validateSelfOnly(currentUserId, request.getUserId());
        validateName(request.getName());
        validateImage(request.getImageData(), request.getImageType());

        if (request.getSourceType() == null) {
            throw new BadRequestException("Source type is required");
        }

        SignatureRole currentRole = resolveOwnRole(principal);

        if (request.getRole() != null && request.getRole() != currentRole) {
            throw new UnauthorizedActionException("You can only create a signature for your own role.");
        }

        Signature signature = new Signature();
        signature.setUserId(currentUserId);
        signature.setRole(currentRole);
        signature.setName(request.getName().trim());
        signature.setImageData(request.getImageData().trim());
        signature.setImageType(request.getImageType().trim().toLowerCase());
        signature.setSourceType(request.getSourceType());
        signature.setIsActive(true);
        signature.setIsDefault(Boolean.TRUE.equals(request.getIsDefault()));

        if (Boolean.TRUE.equals(signature.getIsDefault())) {
            unsetCurrentDefault(currentUserId);
        } else if (signatureRepository.countByUserIdAndIsActiveTrue(currentUserId) == 0) {
            signature.setIsDefault(true);
        }

        return toResponse(signatureRepository.save(signature));
    }

    @Override
    @Transactional(readOnly = true)
    public List<SignatureResponse> getSignatures(Long requestedUserId) {
        UserPrincipal principal = SecurityUtils.currentUser();
        Long currentUserId = Long.valueOf(principal.getId());

        validateSelfOnly(currentUserId, requestedUserId);

        return signatureRepository.findByUserIdAndIsActiveTrueOrderByUpdatedAtDesc(currentUserId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public SignatureResponse getSignatureById(Long id, Long requestedUserId) {
        UserPrincipal principal = SecurityUtils.currentUser();
        Long currentUserId = Long.valueOf(principal.getId());

        validateSelfOnly(currentUserId, requestedUserId);

        Signature signature = getOwnedSignature(id, currentUserId);
        return toResponse(signature);
    }

    @Override
    @Transactional
    public SignatureResponse updateSignature(Long id, SignatureUpdateRequest request, Long requestedUserId) {
        UserPrincipal principal = SecurityUtils.currentUser();
        Long currentUserId = Long.valueOf(principal.getId());

        validateSelfOnly(currentUserId, requestedUserId);

        Signature signature = getOwnedSignature(id, currentUserId);

        validateName(request.getName());
        signature.setName(request.getName().trim());

        boolean hasImageData = request.getImageData() != null && !request.getImageData().isBlank();
        boolean hasImageType = request.getImageType() != null && !request.getImageType().isBlank();

        if (hasImageData || hasImageType) {
            validateImage(
                    hasImageData ? request.getImageData() : signature.getImageData(),
                    hasImageType ? request.getImageType() : signature.getImageType()
            );
        }

        if (hasImageData) {
            signature.setImageData(request.getImageData().trim());
        }

        if (hasImageType) {
            signature.setImageType(request.getImageType().trim().toLowerCase());
        }

        if (request.getSourceType() != null) {
            signature.setSourceType(request.getSourceType());
        }

        return toResponse(signatureRepository.save(signature));
    }

    @Override
    @Transactional
    public void deleteSignature(Long id, Long requestedUserId) {
        UserPrincipal principal = SecurityUtils.currentUser();
        Long currentUserId = Long.valueOf(principal.getId());

        validateSelfOnly(currentUserId, requestedUserId);

        Signature signature = getOwnedSignature(id, currentUserId);
        signature.setIsActive(false);
        signature.setIsDefault(false);
        signatureRepository.save(signature);

        signatureRepository.findByUserIdAndIsDefaultTrueAndIsActiveTrue(currentUserId)
                .or(() -> signatureRepository.findByUserIdAndIsActiveTrueOrderByUpdatedAtDesc(currentUserId)
                        .stream()
                        .findFirst())
                .ifPresent(fallback -> {
                    fallback.setIsDefault(true);
                    signatureRepository.save(fallback);
                });
    }

    @Override
    @Transactional
    public SignatureResponse setDefaultSignature(Long id, Long requestedUserId) {
        UserPrincipal principal = SecurityUtils.currentUser();
        Long currentUserId = Long.valueOf(principal.getId());

        validateSelfOnly(currentUserId, requestedUserId);

        Signature signature = getOwnedSignature(id, currentUserId);
        unsetCurrentDefault(currentUserId);
        signature.setIsDefault(true);

        return toResponse(signatureRepository.save(signature));
    }

    private Signature getOwnedSignature(Long id, Long currentUserId) {
        Signature signature = signatureRepository.findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Signature not found"));

        if (!signature.getUserId().equals(currentUserId)) {
            throw new UnauthorizedActionException("You can only access your own signature.");
        }

        return signature;
    }

    private void validateSelfOnly(Long currentUserId, Long requestedUserId) {
        if (requestedUserId != null && !requestedUserId.equals(currentUserId)) {
            throw new UnauthorizedActionException("You can only manage your own signature.");
        }
    }

    private SignatureRole resolveOwnRole(UserPrincipal principal) {
        List<String> roles = principal.getRoles() == null ? List.of() : principal.getRoles();

        for (String role : roles) {
            String normalized = normalizeRole(role);

            switch (normalized) {
                case "HRADMIN":
                    return SignatureRole.HRADMIN;
                case "HR":
                    return SignatureRole.HR;
                case "MANAGER":
                    return SignatureRole.MANAGER;
                case "DEPARTMENT_HEAD":
                case "DEPARTMENTHEAD":
                    return SignatureRole.DEPARTMENT_HEAD;
                case "CEO":
                case "EXECUTIVE":
                    return SignatureRole.CEO;
                case "EMPLOYEE":
                    return SignatureRole.EMPLOYEE;
                default:
                    break;
            }
        }

        return SignatureRole.EMPLOYEE;
    }

    private String normalizeRole(String role) {
        if (role == null) {
            return "";
        }

        return role
                .replaceFirst("(?i)^ROLE_", "")
                .replaceAll("[\\s-]+", "_")
                .trim()
                .toUpperCase();
    }

    private void validateName(String name) {
        if (name == null || name.trim().isBlank()) {
            throw new BadRequestException("Signature name is required");
        }
    }

    private void validateImage(String imageData, String imageType) {
        if (imageData == null || imageData.trim().isBlank()) {
            throw new BadRequestException("Signature image data is required");
        }

        if (imageData.length() > MAX_BASE64_LENGTH) {
            throw new BadRequestException("Signature image is too large");
        }

        if (imageType == null || imageType.trim().isBlank()) {
            throw new BadRequestException("Signature image type is required");
        }

        String normalizedType = imageType.trim().toLowerCase();

        if (!ALLOWED_IMAGE_TYPES.contains(normalizedType)) {
            throw new BadRequestException("Only png, jpg, and jpeg images are supported");
        }
    }

    private void unsetCurrentDefault(Long userId) {
        signatureRepository.findByUserIdAndIsDefaultTrueAndIsActiveTrue(userId).ifPresent(currentDefault -> {
            currentDefault.setIsDefault(false);
            signatureRepository.save(currentDefault);
        });
    }

    private SignatureResponse toResponse(Signature signature) {
        return SignatureResponse.builder()
                .id(signature.getId())
                .userId(signature.getUserId())
                .role(signature.getRole())
                .name(signature.getName())
                .imageData(signature.getImageData())
                .imageType(signature.getImageType())
                .sourceType(signature.getSourceType())
                .isDefault(signature.getIsDefault())
                .isActive(signature.getIsActive())
                .createdAt(signature.getCreatedAt())
                .updatedAt(signature.getUpdatedAt())
                .build();
    }
}