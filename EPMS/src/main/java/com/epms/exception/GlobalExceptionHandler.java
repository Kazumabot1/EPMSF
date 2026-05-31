package com.epms.exception;

import com.epms.repository.KpiPositionRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    private final KpiPositionRepository kpiPositionRepository;

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequestException(
            BadRequestException ex,
            HttpServletRequest request) {
        ErrorResponse errorResponse = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error(HttpStatus.BAD_REQUEST.getReasonPhrase())
                .message(ex.getMessage())
                .path(request.getRequestURI())
                .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateResourceException(
            DuplicateResourceException ex,
            HttpServletRequest request) {
        ErrorResponse errorResponse = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.CONFLICT.value())
                .error(HttpStatus.CONFLICT.getReasonPhrase())
                .message(ex.getMessage())
                .path(request.getRequestURI())
                .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(KpiTemplatePositionConflictException.class)
    public ResponseEntity<ErrorResponse> handleKpiTemplatePositionConflictException(
            KpiTemplatePositionConflictException ex,
            HttpServletRequest request) {
        log.info(
                "KPI template position conflict on {}: existingTemplateId={}, message={}",
                request.getRequestURI(),
                ex.getExistingTemplateId(),
                ex.getMessage()
        );
        ErrorResponse errorResponse = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.CONFLICT.value())
                .error(HttpStatus.CONFLICT.getReasonPhrase())
                .message(ex.getMessage())
                .path(request.getRequestURI())
                .existingTemplateId(ex.getExistingTemplateId())
                .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(
            ResourceNotFoundException ex,
            HttpServletRequest request) {
        ErrorResponse errorResponse = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.NOT_FOUND.value())
                .error(HttpStatus.NOT_FOUND.getReasonPhrase())
                .message(ex.getMessage())
                .path(request.getRequestURI())
                .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            MethodArgumentNotValidException ex,
            HttpServletRequest request) {
        Map<String, String> validationErrors = new LinkedHashMap<>();

        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            validationErrors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        String readable =
                validationErrors.entrySet().stream()
                        .map(e -> e.getKey() + ": " + e.getValue())
                        .collect(Collectors.joining("; "));

        ErrorResponse errorResponse = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error(HttpStatus.BAD_REQUEST.getReasonPhrase())
                .message(readable.isEmpty() ? "Validation failed" : readable)
                .path(request.getRequestURI())
                .validationErrors(validationErrors)
                .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    /**
     * {@link ResponseStatusException} often renders as RFC 9457 Problem Details without a {@code message} field,
     * which broke API clients expecting JSON {@link ErrorResponse#message}.
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorResponse> handleResponseStatusException(
            ResponseStatusException ex,
            HttpServletRequest request) {
        HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
        if (status == null) {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
        }
        String reason = ex.getReason();
        String message =
                reason != null && !reason.isBlank()
                        ? reason
                        : (ex.getMessage() != null ? ex.getMessage() : status.getReasonPhrase());

        ErrorResponse body =
                ErrorResponse.builder()
                        .timestamp(LocalDateTime.now())
                        .status(status.value())
                        .error(status.getReasonPhrase())
                        .message(message)
                        .path(request.getRequestURI())
                        .build();

        return new ResponseEntity<>(body, status);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationException(
            AuthenticationException ex,
            HttpServletRequest request) {
        String message =
                ex.getMessage() != null && !ex.getMessage().isBlank()
                        ? ex.getMessage()
                        : "Authentication required. Please sign in again.";

        ErrorResponse errorResponse =
                ErrorResponse.builder()
                        .timestamp(LocalDateTime.now())
                        .status(HttpStatus.UNAUTHORIZED.value())
                        .error(HttpStatus.UNAUTHORIZED.getReasonPhrase())
                        .message(message)
                        .path(request.getRequestURI())
                        .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalStateException(
            IllegalStateException ex,
            HttpServletRequest request) {
        if (ex.getMessage() == null || !ex.getMessage().contains("Authenticated user")) {
            return handleUnexpectedException(ex, request);
        }

        ErrorResponse errorResponse =
                ErrorResponse.builder()
                        .timestamp(LocalDateTime.now())
                        .status(HttpStatus.UNAUTHORIZED.value())
                        .error(HttpStatus.UNAUTHORIZED.getReasonPhrase())
                        .message("Authentication required. Please sign in again.")
                        .path(request.getRequestURI())
                        .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(
            AccessDeniedException ex,
            HttpServletRequest request) {
        ErrorResponse errorResponse =
                ErrorResponse.builder()
                        .timestamp(LocalDateTime.now())
                        .status(HttpStatus.FORBIDDEN.value())
                        .error(HttpStatus.FORBIDDEN.getReasonPhrase())
                        .message(
                                ex.getMessage() != null && !ex.getMessage().isBlank()
                                        ? ex.getMessage()
                                        : "Access denied. Your account does not have permission for this action.")
                        .path(request.getRequestURI())
                        .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadableJson(
            HttpMessageNotReadableException ex,
            HttpServletRequest request) {
        String root = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        String hint =
                "Could not read JSON body. Check dates are yyyy-MM-dd and enums match backend values.";
        ErrorResponse errorResponse =
                ErrorResponse.builder()
                        .timestamp(LocalDateTime.now())
                        .status(HttpStatus.BAD_REQUEST.value())
                        .error(HttpStatus.BAD_REQUEST.getReasonPhrase())
                        .message(root != null && !root.isBlank() ? hint + " Details: " + root : hint)
                        .path(request.getRequestURI())
                        .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }
    @ExceptionHandler(BusinessValidationException.class)
    public ResponseEntity<ErrorResponse> handleBusinessValidationException(
            BusinessValidationException ex,
            HttpServletRequest request) {
        ErrorResponse errorResponse = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.UNPROCESSABLE_ENTITY.value())
                .error(HttpStatus.UNPROCESSABLE_ENTITY.getReasonPhrase())
                .message(ex.getMessage())
                .path(request.getRequestURI())
                .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @ExceptionHandler(UnauthorizedActionException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorizedActionException(
            UnauthorizedActionException ex,
            HttpServletRequest request) {
        ErrorResponse errorResponse = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.FORBIDDEN.value())
                .error(HttpStatus.FORBIDDEN.getReasonPhrase())
                .message(ex.getMessage())
                .path(request.getRequestURI())
                .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolationException(
            DataIntegrityViolationException ex,
            HttpServletRequest request) {
        String path = request.getRequestURI();
        String message = "Could not save because a duplicate or invalid database record already exists.";
        Integer existingTemplateId = null;

        if (path != null && path.matches(".*/api/v1/feedback/campaigns/\\d+/targets$")) {
            message = "Could not save campaign targets because one or more selected employees are already stored for this campaign. Refresh the campaign and try again.";
        } else if (path != null && path.contains("/api/employees")) {
            String causeMessage = mostSpecificCauseMessage(ex);
            message = employeeSaveConflictMessage(causeMessage);
        } else if (path != null && path.contains("/api/hr/kpi-templates")) {
            String causeMessage = mostSpecificCauseMessage(ex);
            if (isKpiPositionConflict(causeMessage)) {
                message =
                        "This position already has a KPI form. Choose another position or edit the existing form.";
                existingTemplateId = resolveKpiTemplateIdFromIntegrityViolation(ex, request);
            } else if (isKpiFormItemOptionalLookupConflict(causeMessage)) {
                message = "KPI template category/unit columns are not aligned with custom labels. Restart the backend to apply the schema fix.";
            } else if (isKpiFormItemReferenceConflict(causeMessage)) {
                message = "This KPI row is already used in employee KPI records and cannot be removed.";
            } else if (causeMessage != null
                    && (causeMessage.toLowerCase().contains("start_date")
                    || causeMessage.toLowerCase().contains("end_date"))) {
                message = "KPI template date columns are not aligned with the app. Restart the backend to apply the schema fix, or run the KPI nullable date migration.";
            }
        }

        log.warn(
                "Data integrity violation on {}: existingTemplateId={}, cause={}",
                path,
                existingTemplateId,
                ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage()
        );

        ErrorResponse errorResponse = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.CONFLICT.value())
                .error(HttpStatus.CONFLICT.getReasonPhrase())
                .message(message)
                .path(path)
                .existingTemplateId(existingTemplateId)
                .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpectedException(
            Exception ex,
            HttpServletRequest request) {
        log.error("Unhandled error on {}", request.getRequestURI(), ex);

        ErrorResponse errorResponse =
                ErrorResponse.builder()
                        .timestamp(LocalDateTime.now())
                        .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                        .error(HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase())
                        .message("An unexpected error occurred. Please try again or contact support.")
                        .path(request.getRequestURI())
                        .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private Integer resolveKpiTemplateIdFromIntegrityViolation(
            DataIntegrityViolationException ex,
            HttpServletRequest request) {
        String positionIdParam = request.getParameter("checkPositionId");
        if (positionIdParam != null) {
            try {
                int positionId = Integer.parseInt(positionIdParam);
                return kpiPositionRepository.findActiveWithFormByPositionId(positionId)
                        .map(link -> link.getKpiForm().getId())
                        .orElse(null);
            } catch (NumberFormatException ignored) {
                // fall through
            }
        }

        Throwable cause = ex.getMostSpecificCause();
        if (cause != null && cause.getMessage() != null) {
            String msg = cause.getMessage();
            int idx = msg.indexOf("position_id");
            if (idx >= 0) {
                log.debug("KPI position integrity message: {}", msg);
            }
        }
        return null;
    }


    private static String employeeSaveConflictMessage(String causeMessage) {
        if (causeMessage == null || causeMessage.isBlank()) {
            return "Could not create the employee because a unique employee field is already used. Check work email, staff NRC, and employee code.";
        }

        String msg = causeMessage.toLowerCase();
        if (msg.contains("employee_code")) {
            return "Could not create the employee because the generated employee code already exists. Restart the backend and try again; the code generator will skip used codes.";
        }
        if (msg.contains("email")) {
            return "Could not create the employee because this work email is already used by an employee or login account.";
        }
        if (msg.contains("staff_nrc") || msg.contains("nrc")) {
            return "Could not create the employee because this Staff NRC is already used by another employee.";
        }
        if (msg.contains("employee_department")) {
            return "Could not create the employee because the department assignment could not be saved. Check the selected department and try again.";
        }
        return "Could not create the employee because a unique employee field is already used. Check work email, staff NRC, and employee code.";
    }

    private static boolean isKpiPositionConflict(String causeMessage) {
        if (causeMessage == null) {
            return false;
        }
        String msg = causeMessage.toLowerCase();
        return msg.contains("kpi_positions")
                || msg.contains("position_id")
                || msg.contains("uk82x6nm6ro3k7p1ttuxflwbofq")
                || msg.contains("uk_kpi_positions_position_id");
    }

    private static boolean isKpiFormItemReferenceConflict(String causeMessage) {
        if (causeMessage == null) {
            return false;
        }
        String msg = causeMessage.toLowerCase();
        return msg.contains("employee_kpi_scores")
                && (msg.contains("kpi_form_item_id") || msg.contains("kpi_form_items"));
    }

    private static boolean isKpiFormItemOptionalLookupConflict(String causeMessage) {
        if (causeMessage == null) {
            return false;
        }
        String msg = causeMessage.toLowerCase();
        return (msg.contains("kpi_category_id") || msg.contains("kpi_unit_id"))
                && (msg.contains("cannot be null") || msg.contains("doesn't have a default value"));
    }

    private static String mostSpecificCauseMessage(DataIntegrityViolationException ex) {
        Throwable cause = ex.getMostSpecificCause();
        if (cause != null && cause.getMessage() != null) {
            return cause.getMessage();
        }
        return ex.getMessage();
    }
}
