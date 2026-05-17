
package com.epms.service;

import com.epms.dto.EmployeeAssessmentDtos.AssessmentItemRequest;
import com.epms.dto.EmployeeAssessmentDtos.AssessmentItemResponse;
import com.epms.dto.EmployeeAssessmentDtos.AssessmentRequest;
import com.epms.dto.EmployeeAssessmentDtos.AssessmentResponse;
import com.epms.dto.EmployeeAssessmentDtos.AssessmentScoreBandResponse;
import com.epms.dto.EmployeeAssessmentDtos.AssessmentSectionResponse;
import com.epms.dto.EmployeeAssessmentDtos.ReviewActionRequest;
import com.epms.dto.EmployeeAssessmentDtos.ScoreTableRowResponse;
import com.epms.entity.AssessmentFormDefinition;
import com.epms.entity.AssessmentFormQuestionDefinition;
import com.epms.entity.AssessmentFormScoreBandDefinition;
import com.epms.entity.AssessmentFormSectionDefinition;
import com.epms.entity.Department;
import com.epms.entity.Employee;
import com.epms.entity.EmployeeAssessment;
import com.epms.entity.EmployeeAssessmentAnswer;
import com.epms.entity.Signature;
import com.epms.entity.User;
import com.epms.entity.enums.AssessmentStatus;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.exception.UnauthorizedActionException;
import com.epms.repository.AssessmentFormDefinitionRepository;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.EmployeeAssessmentRepository;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.SignatureRepository;
import com.epms.repository.UserRepository;
import com.epms.security.SecurityUtils;
import com.epms.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmployeeAssessmentService {

    private static final int MAX_RATING = 5;

    private static final String RESPONSE_TYPE_RATING = "RATING";
    private static final String RESPONSE_TYPE_TEXT = "TEXT";
    private static final String RESPONSE_TYPE_YES_NO = "YES_NO";
    private static final String RESPONSE_TYPE_YES_NO_RATING = "YES_NO_RATING";

    private static final List<AssessmentStatus> EMPLOYEE_VISIBLE_STATUSES = List.of(
            AssessmentStatus.DRAFT,
            AssessmentStatus.SUBMITTED,
            AssessmentStatus.PENDING_MANAGER,
            AssessmentStatus.PENDING_DEPARTMENT_HEAD,
            AssessmentStatus.PENDING_HR,
            AssessmentStatus.APPROVED,
            AssessmentStatus.DECLINED,
            AssessmentStatus.REJECTED
    );

    private static final List<AssessmentStatus> REVIEW_TABLE_STATUSES = List.of(
            AssessmentStatus.SUBMITTED,
            AssessmentStatus.PENDING_MANAGER,
            AssessmentStatus.PENDING_DEPARTMENT_HEAD,
            AssessmentStatus.PENDING_HR,
            AssessmentStatus.APPROVED,
            AssessmentStatus.DECLINED,
            AssessmentStatus.REJECTED
    );

    private static final List<AssessmentStatus> NON_EDITABLE_STATUSES = List.of(
            AssessmentStatus.SUBMITTED,
            AssessmentStatus.PENDING_MANAGER,
            AssessmentStatus.PENDING_DEPARTMENT_HEAD,
            AssessmentStatus.PENDING_HR,
            AssessmentStatus.APPROVED,
            AssessmentStatus.DECLINED,
            AssessmentStatus.REJECTED
    );

    private final EmployeeAssessmentRepository assessmentRepository;
    private final AssessmentFormDefinitionRepository formRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final SignatureRepository signatureRepository;

    @Transactional(readOnly = true)
    public AssessmentResponse getTemplateForCurrentUser() {
        User user = currentUserEntity();

        // First: check if the user already has a non-DRAFT assessment (submitted/approved/etc.)
        // This allows employees to view their submitted assessment even if the form period is now closed.
        Optional<EmployeeAssessment> existingNonDraft = assessmentRepository
                .findByUserIdOrderByUpdatedAtDesc(user.getId())
                .stream()
                .filter(a -> a.getStatus() != null && !AssessmentStatus.DRAFT.equals(a.getStatus()))
                .findFirst();

        if (existingNonDraft.isPresent()) {
            return toResponse(existingNonDraft.get());
        }

        // Fall back to finding the active form for drafts / new assessments
        AssessmentFormDefinition form;
        try {
            form = findAssignedActiveFormForCurrentUser();
        } catch (Exception e) {
            // If there is no active form and no submitted assessment, also check for a DRAFT
            Optional<EmployeeAssessment> existingDraft = assessmentRepository
                    .findByUserIdOrderByUpdatedAtDesc(user.getId())
                    .stream()
                    .filter(a -> AssessmentStatus.DRAFT.equals(a.getStatus()))
                    .findFirst();

            if (existingDraft.isPresent()) {
                return toResponse(existingDraft.get());
            }

            throw e;
        }

        return assessmentRepository
                .findFirstByUserIdAndAssessmentFormIdAndStatusInOrderByUpdatedAtDesc(
                        user.getId(),
                        form.getId(),
                        EMPLOYEE_VISIBLE_STATUSES
                )
                .map(this::toResponse)
                .orElseGet(() -> toTemplateResponse(user, resolveProfile(user), form));
    }

    @Transactional(readOnly = true)
    public AssessmentResponse getLatestDraftForCurrentUser() {
        return getTemplateForCurrentUser();
    }

    @Transactional(readOnly = true)
    public List<ScoreTableRowResponse> getMyHistory() {
        Integer userId = SecurityUtils.currentUserId();
        return assessmentRepository
                .findByUserIdOrderByUpdatedAtDesc(userId)
                .stream()
                .map(this::toScoreRow)
                .toList();
    }

    @Transactional(readOnly = true)
    public AssessmentResponse getById(Long id) {
        EmployeeAssessment assessment = findAssessment(id);
        assertCanView(assessment);
        return toResponse(assessment);
    }

    @Transactional
    public AssessmentResponse saveDraft(AssessmentRequest request) {
        User user = currentUserEntity();
        AssessmentFormDefinition form = findAssignedActiveFormForCurrentUser();

        ensureFormOpenForSubmission(form);
        validateRequestFormMatchesAssignedForm(request, form);
        ensureNoNonEditableAssessment(user.getId(), form.getId());

        EmployeeAssessment assessment = assessmentRepository
                .findFirstByUserIdAndAssessmentFormIdAndStatusOrderByUpdatedAtDesc(
                        user.getId(),
                        form.getId(),
                        AssessmentStatus.DRAFT
                )
                .orElseGet(() -> createNewAssessment(user, form));

        applyRequest(assessment, request, AssessmentStatus.DRAFT, form);
        calculateScores(assessment, form);

        return toResponse(assessmentRepository.save(assessment));
    }

    @Transactional
    public AssessmentResponse updateDraft(Long id, AssessmentRequest request) {
        EmployeeAssessment assessment = findAssessment(id);

        assertOwner(assessment);
        ensureEditable(assessment);

        AssessmentFormDefinition form = findAssignedActiveFormForCurrentUser();

        ensureFormOpenForSubmission(form);
        validateAssessmentBelongsToAssignedForm(assessment, form);
        validateRequestFormMatchesAssignedForm(request, form);

        applyRequest(assessment, request, AssessmentStatus.DRAFT, form);
        calculateScores(assessment, form);

        return toResponse(assessmentRepository.save(assessment));
    }

    @Transactional
    public AssessmentResponse submit(Long id, AssessmentRequest request) {
        EmployeeAssessment assessment = findAssessment(id);

        assertOwner(assessment);
        ensureEditable(assessment);

        AssessmentFormDefinition form = findAssignedActiveFormForCurrentUser();

        ensureFormOpenForSubmission(form);
        validateAssessmentBelongsToAssignedForm(assessment, form);
        validateRequestFormMatchesAssignedForm(request, form);

        applyRequest(assessment, request, AssessmentStatus.PENDING_DEPARTMENT_HEAD, form);
        validateComplete(assessment);
        calculateScores(assessment, form);
        attachEmployeeSignature(assessment);

        assessment.setSubmittedAt(LocalDateTime.now());

        return toResponse(assessmentRepository.save(assessment));
    }

    @Transactional
    public AssessmentResponse managerRemark(Long id, ReviewActionRequest request) {
        EmployeeAssessment assessment = findAssessment(id);
        UserPrincipal principal = SecurityUtils.currentUser();

        if (!Objects.equals(assessment.getManagerUserId(), principal.getId())) {
            throw new UnauthorizedActionException("Only this employee's assigned manager can add remarks to this self-assessment.");
        }

        if (AssessmentStatus.DRAFT.equals(assessment.getStatus())) {
            throw new BadRequestException("Manager cannot review a draft assessment.");
        }

        if (AssessmentStatus.PENDING_HR.equals(assessment.getStatus())
                || AssessmentStatus.APPROVED.equals(assessment.getStatus())
                || AssessmentStatus.DECLINED.equals(assessment.getStatus())
                || AssessmentStatus.REJECTED.equals(assessment.getStatus())) {
            throw new BadRequestException("Manager remarks can no longer be changed after the assessment leaves department-head review.");
        }

        assessment.setManagerComment(clean(request == null ? null : request.getComment()));

        if (AssessmentStatus.PENDING_MANAGER.equals(assessment.getStatus())
                || AssessmentStatus.SUBMITTED.equals(assessment.getStatus())) {
            assessment.setStatus(AssessmentStatus.PENDING_DEPARTMENT_HEAD);
        }

        return toResponse(assessmentRepository.save(assessment));
    }

    @Transactional
    public AssessmentResponse managerSign(Long id, ReviewActionRequest request) {
        return managerRemark(id, request);
    }

    @Transactional
    public AssessmentResponse departmentHeadSign(Long id, ReviewActionRequest request) {
        EmployeeAssessment assessment = findAssessment(id);
        UserPrincipal principal = SecurityUtils.currentUser();
        Set<String> roles = currentUserTargetRoles(principal);

        if (!roles.contains("DEPARTMENT_HEAD")) {
            throw new UnauthorizedActionException("Only department head can sign this self-assessment.");
        }

        if (principal.getDepartmentId() == null || assessment.getDepartmentId() == null) {
            throw new BadRequestException("Department information is missing.");
        }

        if (!Objects.equals(principal.getDepartmentId(), assessment.getDepartmentId())) {
            throw new UnauthorizedActionException("Only the department head of this employee's department can sign this self-assessment.");
        }

        if (!AssessmentStatus.PENDING_DEPARTMENT_HEAD.equals(assessment.getStatus())
                && !AssessmentStatus.PENDING_MANAGER.equals(assessment.getStatus())
                && !AssessmentStatus.SUBMITTED.equals(assessment.getStatus())) {
            throw new BadRequestException("This assessment is not waiting for department head signature.");
        }

        User currentUser = currentUserEntity();
        Signature signature = currentDefaultSignature();

        assessment.setDepartmentHeadUserId(currentUser.getId());
        assessment.setDepartmentHeadName(currentUser.getFullName());
        assessment.setDepartmentHeadSignatureId(signature.getId());
        assessment.setDepartmentHeadSignatureName(signature.getName());
        assessment.setDepartmentHeadSignatureImageData(signature.getImageData());
        assessment.setDepartmentHeadSignatureImageType(signature.getImageType());
        assessment.setDepartmentHeadSignedAt(LocalDateTime.now());
        assessment.setDepartmentHeadComment(clean(request == null ? null : request.getComment()));
        assessment.setStatus(AssessmentStatus.PENDING_HR);

        return toResponse(assessmentRepository.save(assessment));
    }

    @Transactional
    public AssessmentResponse hrApprove(Long id, ReviewActionRequest request) {
        EmployeeAssessment assessment = findAssessment(id);
        UserPrincipal principal = SecurityUtils.currentUser();
        Set<String> roles = currentUserTargetRoles(principal);

        if (!roles.contains("HR") && !roles.contains("ADMIN")) {
            throw new UnauthorizedActionException("Only HR can approve this self-assessment.");
        }

        if (!AssessmentStatus.PENDING_HR.equals(assessment.getStatus())) {
            throw new BadRequestException("This assessment is not ready for HR approval.");
        }

        if (assessment.getDepartmentHeadSignatureId() == null) {
            throw new BadRequestException("HR cannot approve until the department head signature is completed.");
        }

        Signature signature = currentDefaultSignature();

        assessment.setHrSignatureId(signature.getId());
        assessment.setHrSignatureName(signature.getName());
        assessment.setHrSignatureImageData(signature.getImageData());
        assessment.setHrSignatureImageType(signature.getImageType());
        assessment.setHrSignedAt(LocalDateTime.now());
        assessment.setHrComment(clean(request == null ? null : request.getComment()));
        assessment.setStatus(AssessmentStatus.APPROVED);
        assessment.setApprovedAt(LocalDateTime.now());

        return toResponse(assessmentRepository.save(assessment));
    }

    @Transactional
    public AssessmentResponse hrDecline(Long id, ReviewActionRequest request) {
        EmployeeAssessment assessment = findAssessment(id);
        UserPrincipal principal = SecurityUtils.currentUser();
        Set<String> roles = currentUserTargetRoles(principal);

        if (!roles.contains("HR") && !roles.contains("ADMIN")) {
            throw new UnauthorizedActionException("Only HR can decline this self-assessment.");
        }

        if (AssessmentStatus.DRAFT.equals(assessment.getStatus())) {
            throw new BadRequestException("HR cannot decline a draft assessment.");
        }

        if (AssessmentStatus.APPROVED.equals(assessment.getStatus())) {
            throw new BadRequestException("Approved assessments cannot be declined.");
        }

        String reason = clean(request == null ? null : request.getReason());

        if (reason == null) {
            reason = "Declined by HR.";
        }

        assessment.setDeclineReason(reason);
        assessment.setHrComment(clean(request == null ? null : request.getComment()));
        assessment.setStatus(AssessmentStatus.DECLINED);
        assessment.setDeclinedAt(LocalDateTime.now());

        return toResponse(assessmentRepository.save(assessment));
    }

    @Transactional(readOnly = true)
    public List<ScoreTableRowResponse> getMyScores() {
        Integer userId = SecurityUtils.currentUserId();

        return assessmentRepository
                .findByUserIdAndStatusInOrderBySubmittedAtDesc(userId, REVIEW_TABLE_STATUSES)
                .stream()
                .map(this::toScoreRow)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ScoreTableRowResponse> getScoreTable() {
        UserPrincipal principal = SecurityUtils.currentUser();
        Set<String> roles = currentUserTargetRoles(principal);

        if (roles.contains("HR") || roles.contains("ADMIN")) {
            return assessmentRepository
                    .findByStatusInOrderBySubmittedAtDesc(REVIEW_TABLE_STATUSES)
                    .stream()
                    .map(this::toScoreRow)
                    .toList();
        }

        if (roles.contains("MANAGER")) {
            return assessmentRepository
                    .findByStatusInAndManagerUserIdOrderBySubmittedAtDesc(
                            REVIEW_TABLE_STATUSES,
                            principal.getId()
                    )
                    .stream()
                    .map(this::toScoreRow)
                    .toList();
        }

        if (roles.contains("DEPARTMENT_HEAD")) {
            if (principal.getDepartmentId() == null) {
                return List.of();
            }

            return assessmentRepository
                    .findByStatusInAndDepartmentIdOrderBySubmittedAtDesc(
                            REVIEW_TABLE_STATUSES,
                            principal.getDepartmentId()
                    )
                    .stream()
                    .map(this::toScoreRow)
                    .toList();
        }

        throw new UnauthorizedActionException("You do not have permission to view this score table.");
    }

    private AssessmentResponse toTemplateResponse(User user, EmployeeProfile profile, AssessmentFormDefinition form) {
        return AssessmentResponse.builder()
                .id(null)
                .formId(form.getId())
                .assessmentFormId(form.getId())
                .formName(form.getFormName())
                .companyName(form.getCompanyName())
                .userId(user.getId())
                .employeeId(profile.employeeId())
                .employeeName(profile.employeeName())
                .employeeCode(profile.employeeCode())
                .currentPosition(profile.currentPosition())
                .departmentId(profile.departmentId())
                .departmentName(profile.departmentName())
                .managerUserId(profile.managerUserId())
                .managerName(profile.managerName())
                .departmentHeadUserId(null)
                .departmentHeadName(null)
                .assessmentDate(LocalDate.now())
                .period(String.valueOf(LocalDateTime.now().getYear()))
                .status(AssessmentStatus.DRAFT.name())
                .totalScore(0.0)
                .maxScore(0.0)
                .scorePercent(0.0)
                .performanceLabel("Not scored")
                .remarks("")
                .managerComment("")
                .hrComment("")
                .declineReason("")
                .sections(templateSectionsFromForm(form))
                .scoreBands(scoreBandsFromForm(form))
                .build();
    }

    private EmployeeAssessment createNewAssessment(User user, AssessmentFormDefinition form) {
        EmployeeProfile profile = resolveProfile(user);

        return EmployeeAssessment.builder()
                .userId(user.getId())
                .employeeId(profile.employeeId())
                .employeeName(profile.employeeName())
                .employeeCode(profile.employeeCode())
                .currentPosition(profile.currentPosition())
                .departmentId(profile.departmentId())
                .departmentName(profile.departmentName())
                .managerUserId(profile.managerUserId())
                .managerName(profile.managerName())
                .assessmentFormId(form.getId())
                .formName(form.getFormName())
                .companyName(form.getCompanyName())
                .assessmentDate(LocalDate.now())
                .status(AssessmentStatus.DRAFT)
                .period(String.valueOf(LocalDateTime.now().getYear()))
                .totalScore(0.0)
                .maxScore(0.0)
                .scorePercent(0.0)
                .performanceLabel("Not scored")
                .answers(new ArrayList<>())
                .build();
    }

    private void applyRequest(
            EmployeeAssessment assessment,
            AssessmentRequest request,
            AssessmentStatus status,
            AssessmentFormDefinition form
    ) {
        if (request == null) {
            throw new BadRequestException("Assessment request body is required.");
        }

        String period = normalizeOptional(request.getPeriod());

        assessment.setAssessmentFormId(form.getId());
        assessment.setFormName(form.getFormName());
        assessment.setCompanyName(form.getCompanyName());
        assessment.setPeriod(period == null ? String.valueOf(LocalDateTime.now().getYear()) : period);
        assessment.setRemarks(normalizeOptional(request.getRemarks()));
        assessment.setStatus(status);

        Map<Integer, AssessmentItemRequest> itemsByQuestionId = request.getItems() == null
                ? Map.of()
                : request.getItems()
                .stream()
                .filter(Objects::nonNull)
                .filter(item -> item.getQuestionId() != null)
                .collect(Collectors.toMap(
                        AssessmentItemRequest::getQuestionId,
                        Function.identity(),
                        (first, ignored) -> first
                ));

        Map<String, AssessmentItemRequest> itemsByStableKey = request.getItems() == null
                ? Map.of()
                : request.getItems()
                .stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(
                        item -> stableItemKey(item.getSectionTitle(), item.getQuestionText(), item.getItemOrder()),
                        Function.identity(),
                        (first, ignored) -> first
                ));

        assessment.getAnswers().clear();

        int order = 1;

        for (AssessmentFormSectionDefinition section : sortedSections(form)) {
            String sectionTitle = normalizeRequired(section.getTitle(), "Section title is required.");

            for (AssessmentFormQuestionDefinition question : safeQuestions(section)) {
                String questionText = normalizeRequired(question.getQuestionText(), "Question text is required.");
                String responseType = resolveResponseType(question.getResponseType());
                AssessmentItemRequest submittedItem = itemsByQuestionId.get(question.getId());

                if (submittedItem == null) {
                    submittedItem = itemsByStableKey.get(stableItemKey(sectionTitle, questionText, order));
                }

                assessment.addAnswer(
                        buildAnswer(sectionTitle, question, questionText, responseType, submittedItem, order)
                );

                order++;
            }
        }

        if (assessment.getAnswers().isEmpty()) {
            throw new BadRequestException("The selected HR assessment form has no assessment subjects.");
        }
    }

    private EmployeeAssessmentAnswer buildAnswer(
            String sectionTitle,
            AssessmentFormQuestionDefinition question,
            String questionText,
            String responseType,
            AssessmentItemRequest submittedItem,
            int order
    ) {
        Integer rating = null;
        Boolean yesNoAnswer = null;
        String comment = null;

        if (submittedItem != null) {
            comment = normalizeOptional(submittedItem.getComment());

            if (RESPONSE_TYPE_RATING.equals(responseType) || RESPONSE_TYPE_YES_NO_RATING.equals(responseType)) {
                rating = submittedItem.getRating();

                if (rating != null && (rating < 1 || rating > MAX_RATING)) {
                    throw new BadRequestException("Ratings must be between 1 and 5.");
                }
            }

            if (RESPONSE_TYPE_YES_NO.equals(responseType) || RESPONSE_TYPE_YES_NO_RATING.equals(responseType)) {
                yesNoAnswer = submittedItem.getYesNoAnswer();
            }
        }

        return EmployeeAssessmentAnswer.builder()
                .questionId(question.getId())
                .sectionTitle(sectionTitle)
                .questionText(questionText)
                .itemOrder(order)
                .responseType(responseType)
                .required(question.getRequired() == null || question.getRequired())
                .weight(normalizeWeight(question.getWeight()))
                .rating(rating)
                .maxRating(MAX_RATING)
                .comment(comment)
                .yesNoAnswer(yesNoAnswer)
                .build();
    }

    private void validateComplete(EmployeeAssessment assessment) {
        for (EmployeeAssessmentAnswer answer : assessment.getAnswers()) {
            if (!Boolean.TRUE.equals(answer.getRequired())) {
                continue;
            }

            String responseType = resolveResponseType(answer.getResponseType());

            if (RESPONSE_TYPE_TEXT.equals(responseType) && normalizeOptional(answer.getComment()) == null) {
                throw new BadRequestException("Please answer every required text question before submitting.");
            }

            if ((RESPONSE_TYPE_YES_NO.equals(responseType) || RESPONSE_TYPE_YES_NO_RATING.equals(responseType))
                    && answer.getYesNoAnswer() == null) {
                throw new BadRequestException("Please choose Yes or No for every required assessment subject.");
            }

            if ((RESPONSE_TYPE_RATING.equals(responseType) || RESPONSE_TYPE_YES_NO_RATING.equals(responseType))
                    && answer.getRating() == null) {
                throw new BadRequestException("Please rate every required assessment subject before submitting.");
            }
        }
    }

    private void calculateScores(EmployeeAssessment assessment, AssessmentFormDefinition form) {
        List<EmployeeAssessmentAnswer> scoredAnswers = assessment.getAnswers()
                .stream()
                .filter(answer -> {
                    String responseType = resolveResponseType(answer.getResponseType());
                    return RESPONSE_TYPE_RATING.equals(responseType) || RESPONSE_TYPE_YES_NO_RATING.equals(responseType);
                })
                .filter(answer -> answer.getRating() != null)
                .toList();

        double total = scoredAnswers.stream()
                .mapToDouble(answer -> answer.getRating() * normalizeWeight(answer.getWeight()))
                .sum();

        double max = scoredAnswers.stream()
                .mapToDouble(answer -> MAX_RATING * normalizeWeight(answer.getWeight()))
                .sum();

        double percent = max == 0 ? 0.0 : round2((total * 100.0) / max);

        assessment.setTotalScore(round2(total));
        assessment.setMaxScore(round2(max));
        assessment.setScorePercent(percent);
        assessment.setPerformanceLabel(resolvePerformanceLabel(percent, form));
    }

    private String resolvePerformanceLabel(double percent, AssessmentFormDefinition form) {
        List<AssessmentFormScoreBandDefinition> bands = form.getScoreBands();

        if (bands != null && !bands.isEmpty()) {
            return bands.stream()
                    .filter(band -> percent >= band.getMinScore() && percent <= band.getMaxScore())
                    .sorted(Comparator.comparing(
                            AssessmentFormScoreBandDefinition::getSortOrder,
                            Comparator.nullsLast(Integer::compareTo)
                    ))
                    .map(AssessmentFormScoreBandDefinition::getLabel)
                    .findFirst()
                    .orElse("Not scored");
        }

        if (percent >= 86) return "Outstanding";
        if (percent >= 71) return "Good";
        if (percent >= 60) return "Meet Requirement";
        if (percent >= 40) return "Need Improvement";
        return "Unsatisfactory";
    }

    private AssessmentResponse toResponse(EmployeeAssessment assessment) {
        AssessmentFormDefinition form = assessment.getAssessmentFormId() == null
                ? null
                : formRepository.findById(assessment.getAssessmentFormId()).orElse(null);

        return AssessmentResponse.builder()
                .id(assessment.getId())
                .formId(assessment.getAssessmentFormId())
                .assessmentFormId(assessment.getAssessmentFormId())
                .formName(assessment.getFormName())
                .companyName(assessment.getCompanyName())
                .userId(assessment.getUserId())
                .employeeId(assessment.getEmployeeId())
                .employeeName(assessment.getEmployeeName())
                .employeeCode(assessment.getEmployeeCode())
                .currentPosition(assessment.getCurrentPosition())
                .departmentId(assessment.getDepartmentId())
                .departmentName(assessment.getDepartmentName())
                .managerUserId(assessment.getManagerUserId())
                .managerName(assessment.getManagerName())
                .departmentHeadUserId(assessment.getDepartmentHeadUserId())
                .departmentHeadName(assessment.getDepartmentHeadName())
                .assessmentDate(assessment.getAssessmentDate())
                .period(assessment.getPeriod())
                .status(assessment.getStatus() == null ? null : assessment.getStatus().name())
                .totalScore(nullToZero(assessment.getTotalScore()))
                .maxScore(nullToZero(assessment.getMaxScore()))
                .scorePercent(nullToZero(assessment.getScorePercent()))
                .performanceLabel(assessment.getPerformanceLabel())
                .remarks(assessment.getRemarks())
                .managerComment(assessment.getManagerComment())
                .hrComment(assessment.getHrComment())
                .departmentHeadComment(assessment.getDepartmentHeadComment())
                .declineReason(assessment.getDeclineReason())
                .employeeSignatureId(assessment.getEmployeeSignatureId())
                .employeeSignatureName(assessment.getEmployeeSignatureName())
                .employeeSignatureImageData(assessment.getEmployeeSignatureImageData())
                .employeeSignatureImageType(assessment.getEmployeeSignatureImageType())
                .employeeSignedAt(assessment.getEmployeeSignedAt())
                .managerSignatureId(assessment.getManagerSignatureId())
                .managerSignatureName(assessment.getManagerSignatureName())
                .managerSignatureImageData(assessment.getManagerSignatureImageData())
                .managerSignatureImageType(assessment.getManagerSignatureImageType())
                .managerSignedAt(assessment.getManagerSignedAt())
                .departmentHeadSignatureId(assessment.getDepartmentHeadSignatureId())
                .departmentHeadSignatureName(assessment.getDepartmentHeadSignatureName())
                .departmentHeadSignatureImageData(assessment.getDepartmentHeadSignatureImageData())
                .departmentHeadSignatureImageType(assessment.getDepartmentHeadSignatureImageType())
                .departmentHeadSignedAt(assessment.getDepartmentHeadSignedAt())
                .hrSignatureId(assessment.getHrSignatureId())
                .hrSignatureName(assessment.getHrSignatureName())
                .hrSignatureImageData(assessment.getHrSignatureImageData())
                .hrSignatureImageType(assessment.getHrSignatureImageType())
                .hrSignedAt(assessment.getHrSignedAt())
                .createdAt(assessment.getCreatedAt())
                .updatedAt(assessment.getUpdatedAt())
                .submittedAt(assessment.getSubmittedAt())
                .approvedAt(assessment.getApprovedAt())
                .declinedAt(assessment.getDeclinedAt())
                .sections(groupSections(assessment.getAnswers()))
                .scoreBands(form == null ? defaultScoreBands() : scoreBandsFromForm(form))
                .build();
    }

    private ScoreTableRowResponse toScoreRow(EmployeeAssessment assessment) {
        return ScoreTableRowResponse.builder()
                .id(assessment.getId())
                .formId(assessment.getAssessmentFormId())
                .assessmentFormId(assessment.getAssessmentFormId())
                .formName(assessment.getFormName())
                .employeeId(assessment.getEmployeeId())
                .employeeName(assessment.getEmployeeName())
                .employeeCode(assessment.getEmployeeCode())
                .departmentId(assessment.getDepartmentId())
                .departmentName(assessment.getDepartmentName())
                .managerUserId(assessment.getManagerUserId())
                .managerName(assessment.getManagerName())
                .period(assessment.getPeriod())
                .status(assessment.getStatus() == null ? null : assessment.getStatus().name())
                .totalScore(nullToZero(assessment.getTotalScore()))
                .maxScore(nullToZero(assessment.getMaxScore()))
                .scorePercent(nullToZero(assessment.getScorePercent()))
                .performanceLabel(assessment.getPerformanceLabel())
                .submittedAt(assessment.getSubmittedAt())
                .approvedAt(assessment.getApprovedAt())
                .declinedAt(assessment.getDeclinedAt())
                .employeeSigned(assessment.getEmployeeSignatureId() != null)
                .managerSigned(assessment.getManagerSignatureId() != null)
                .departmentHeadSigned(assessment.getDepartmentHeadSignatureId() != null)
                .hrSigned(assessment.getHrSignatureId() != null)
                .build();
    }

    private List<AssessmentSectionResponse> templateSectionsFromForm(AssessmentFormDefinition form) {
        List<AssessmentSectionResponse> sections = new ArrayList<>();
        int itemOrder = 1;

        for (AssessmentFormSectionDefinition section : sortedSections(form)) {
            List<AssessmentItemResponse> items = new ArrayList<>();

            for (AssessmentFormQuestionDefinition question : safeQuestions(section)) {
                items.add(templateItem(section, question, itemOrder));
                itemOrder++;
            }

            sections.add(AssessmentSectionResponse.builder()
                    .id(section.getId())
                    .title(section.getTitle())
                    .orderNo(section.getOrderNo())
                    .items(items)
                    .build());
        }

        return sections;
    }

    private AssessmentItemResponse templateItem(
            AssessmentFormSectionDefinition section,
            AssessmentFormQuestionDefinition question,
            int itemOrder
    ) {
        return AssessmentItemResponse.builder()
                .id(null)
                .questionId(question.getId())
                .sectionTitle(section.getTitle())
                .questionText(question.getQuestionText())
                .itemOrder(itemOrder)
                .responseType(resolveResponseType(question.getResponseType()))
                .isRequired(question.getRequired() == null || question.getRequired())
                .weight(normalizeWeight(question.getWeight()))
                .rating(null)
                .maxRating(MAX_RATING)
                .comment("")
                .yesNoAnswer(null)
                .build();
    }

    private List<AssessmentSectionResponse> groupSections(List<EmployeeAssessmentAnswer> answers) {
        Map<String, List<AssessmentItemResponse>> grouped = new LinkedHashMap<>();

        answers.stream()
                .sorted(Comparator.comparing(
                        EmployeeAssessmentAnswer::getItemOrder,
                        Comparator.nullsLast(Integer::compareTo)
                ))
                .forEach(answer -> grouped.computeIfAbsent(answer.getSectionTitle(), ignored -> new ArrayList<>())
                        .add(AssessmentItemResponse.builder()
                                .id(answer.getId())
                                .questionId(answer.getQuestionId())
                                .sectionTitle(answer.getSectionTitle())
                                .questionText(answer.getQuestionText())
                                .itemOrder(answer.getItemOrder())
                                .responseType(resolveResponseType(answer.getResponseType()))
                                .isRequired(answer.getRequired() == null || answer.getRequired())
                                .weight(normalizeWeight(answer.getWeight()))
                                .rating(answer.getRating())
                                .maxRating(answer.getMaxRating() == null ? MAX_RATING : answer.getMaxRating())
                                .comment(answer.getComment())
                                .yesNoAnswer(answer.getYesNoAnswer())
                                .build()));

        int sectionOrder = 1;
        List<AssessmentSectionResponse> sections = new ArrayList<>();

        for (Map.Entry<String, List<AssessmentItemResponse>> entry : grouped.entrySet()) {
            sections.add(AssessmentSectionResponse.builder()
                    .id(null)
                    .title(entry.getKey())
                    .orderNo(sectionOrder++)
                    .items(entry.getValue())
                    .build());
        }

        return sections;
    }

    private AssessmentFormDefinition findAssignedActiveFormForCurrentUser() {
        UserPrincipal principal = SecurityUtils.currentUser();
        Set<String> currentRoles = currentUserTargetRoles(principal);
        LocalDate today = LocalDate.now();

        return formRepository
                .findByActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByCreatedAtDesc(today, today)
                .stream()
                .filter(form -> formTargetsCurrentUser(form, currentRoles))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No active self-assessment form is available for your role or the form date period is closed. Please contact HR."
                ));
    }

    private void ensureFormOpenForSubmission(AssessmentFormDefinition form) {
        LocalDate today = LocalDate.now();

        if (form == null || !Boolean.TRUE.equals(form.getActive())) {
            throw new BadRequestException("This self-assessment form is not active.");
        }

        if (form.getStartDate() != null && today.isBefore(form.getStartDate())) {
            throw new BadRequestException("This self-assessment form is not open yet.");
        }

        if (form.getEndDate() != null && today.isAfter(form.getEndDate())) {
            throw new BadRequestException("This self-assessment form submission period has ended.");
        }
    }

    private void ensureNoNonEditableAssessment(Integer userId, Integer formId) {
        assessmentRepository
                .findFirstByUserIdAndAssessmentFormIdAndStatusInOrderByUpdatedAtDesc(
                        userId,
                        formId,
                        NON_EDITABLE_STATUSES
                )
                .ifPresent(existing -> {
                    throw new BadRequestException("You already submitted this self-assessment form.");
                });
    }

    private boolean formTargetsCurrentUser(AssessmentFormDefinition form, Set<String> currentRoles) {
        if (form.getTargetRoles() == null || form.getTargetRoles().isEmpty()) {
            return false;
        }

        return form.getTargetRoles()
                .stream()
                .map(this::canonicalRole)
                .anyMatch(currentRoles::contains);
    }

    private Set<String> currentUserTargetRoles(UserPrincipal principal) {
        Set<String> roles = new LinkedHashSet<>();

        if (principal.getRoles() != null) {
            principal.getRoles()
                    .stream()
                    .map(this::canonicalRole)
                    .filter(role -> !role.isBlank())
                    .forEach(roles::add);
        }

        String dashboardRole = roleFromDashboard(principal.getDashboard());

        if (dashboardRole != null) {
            roles.add(dashboardRole);
        }

        return roles;
    }

    private Signature currentDefaultSignature() {
        Integer userId = SecurityUtils.currentUserId();

        return signatureRepository
                .findByUserIdAndIsDefaultTrueAndIsActiveTrue(Long.valueOf(userId))
                .orElseThrow(() -> new BadRequestException("Please create and set your own default signature before signing."));
    }

    private void attachEmployeeSignature(EmployeeAssessment assessment) {
        Signature signature = currentDefaultSignature();

        assessment.setEmployeeSignatureId(signature.getId());
        assessment.setEmployeeSignatureName(signature.getName());
        assessment.setEmployeeSignatureImageData(signature.getImageData());
        assessment.setEmployeeSignatureImageType(signature.getImageType());
        assessment.setEmployeeSignedAt(LocalDateTime.now());
    }

    private List<AssessmentFormSectionDefinition> sortedSections(AssessmentFormDefinition form) {
        if (form.getSections() == null) {
            return List.of();
        }

        return form.getSections()
                .stream()
                .sorted(Comparator.comparing(
                        AssessmentFormSectionDefinition::getOrderNo,
                        Comparator.nullsLast(Integer::compareTo)
                ))
                .toList();
    }

    private List<AssessmentFormQuestionDefinition> safeQuestions(AssessmentFormSectionDefinition section) {
        return section.getQuestions() == null ? List.of() : section.getQuestions();
    }

    private List<AssessmentScoreBandResponse> scoreBandsFromForm(AssessmentFormDefinition form) {
        if (form.getScoreBands() == null || form.getScoreBands().isEmpty()) {
            return defaultScoreBands();
        }

        return form.getScoreBands()
                .stream()
                .sorted(Comparator.comparing(
                        AssessmentFormScoreBandDefinition::getSortOrder,
                        Comparator.nullsLast(Integer::compareTo)
                ))
                .map(band -> AssessmentScoreBandResponse.builder()
                        .id(band.getId())
                        .minScore(band.getMinScore())
                        .maxScore(band.getMaxScore())
                        .label(band.getLabel())
                        .description(band.getDescription())
                        .sortOrder(band.getSortOrder())
                        .build())
                .toList();
    }

    private List<AssessmentScoreBandResponse> defaultScoreBands() {
        return List.of(
                AssessmentScoreBandResponse.builder()
                        .minScore(86)
                        .maxScore(100)
                        .label("Outstanding")
                        .description("Performance exceptional and far exceeds expectations.")
                        .sortOrder(1)
                        .build(),
                AssessmentScoreBandResponse.builder()
                        .minScore(71)
                        .maxScore(85)
                        .label("Good")
                        .description("Performance is consistent.")
                        .sortOrder(2)
                        .build(),
                AssessmentScoreBandResponse.builder()
                        .minScore(60)
                        .maxScore(70)
                        .label("Meet Requirement")
                        .description("Performance is satisfactory.")
                        .sortOrder(3)
                        .build(),
                AssessmentScoreBandResponse.builder()
                        .minScore(40)
                        .maxScore(59)
                        .label("Need Improvement")
                        .description("Performance is inconsistent.")
                        .sortOrder(4)
                        .build(),
                AssessmentScoreBandResponse.builder()
                        .minScore(0)
                        .maxScore(39)
                        .label("Unsatisfactory")
                        .description("Performance does not meet the minimum requirement.")
                        .sortOrder(5)
                        .build()
        );
    }

    private EmployeeAssessment findAssessment(Long id) {
        return assessmentRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment not found."));
    }

    private User currentUserEntity() {
        Integer userId = SecurityUtils.currentUserId();

        return userRepository
                .findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
    }

    private EmployeeProfile resolveProfile(User user) {
        Optional<Employee> employee = user.getEmployeeId() == null
                ? Optional.empty()
                : employeeRepository.findById(user.getEmployeeId());

        String employeeName = normalizeOptional(user.getFullName());

        if (employeeName == null && employee.isPresent()) {
            String firstName = normalizeOptional(employee.get().getFirstName());
            String lastName = normalizeOptional(employee.get().getLastName());

            employeeName = String.join(
                    " ",
                    List.of(firstName == null ? "" : firstName, lastName == null ? "" : lastName)
            ).trim();
        }

        if (employeeName == null || employeeName.isBlank()) {
            employeeName = user.getEmail();
        }

        String currentPosition = user.getPosition() == null
                ? null
                : user.getPosition().getPositionTitle();

        if (currentPosition == null && employee.isPresent() && employee.get().getPosition() != null) {
            currentPosition = employee.get().getPosition().getPositionTitle();
        }

        Integer departmentId = user.getDepartmentId();
        String departmentName = null;

        if (departmentId != null) {
            departmentName = departmentRepository
                    .findById(departmentId)
                    .map(Department::getDepartmentName)
                    .orElse(null);
        }

        Integer managerUserId = user.getManagerId();
        String managerName = null;

        if (managerUserId != null) {
            managerName = userRepository
                    .findById(managerUserId)
                    .map(User::getFullName)
                    .orElse(null);
        }

        return new EmployeeProfile(
                user.getEmployeeId(),
                employeeName,
                normalizeOptional(user.getEmployeeCode()),
                normalizeOptional(currentPosition),
                departmentId,
                departmentName,
                managerUserId,
                normalizeOptional(managerName)
        );
    }

    private void assertCanView(EmployeeAssessment assessment) {
        UserPrincipal principal = SecurityUtils.currentUser();
        Set<String> roles = currentUserTargetRoles(principal);

        if (assessment.getUserId().equals(principal.getId())) {
            return;
        }

        if (roles.contains("HR") || roles.contains("ADMIN")) {
            return;
        }

        if (roles.contains("MANAGER") && Objects.equals(assessment.getManagerUserId(), principal.getId())) {
            return;
        }

        if (roles.contains("DEPARTMENT_HEAD") && Objects.equals(assessment.getDepartmentId(), principal.getDepartmentId())) {
            return;
        }

        throw new UnauthorizedActionException("You do not have permission to view this assessment.");
    }

    private void assertOwner(EmployeeAssessment assessment) {
        Integer userId = SecurityUtils.currentUserId();

        if (!assessment.getUserId().equals(userId)) {
            throw new UnauthorizedActionException("You can update only your own assessment.");
        }
    }

    private void ensureEditable(EmployeeAssessment assessment) {
        if (!AssessmentStatus.DRAFT.equals(assessment.getStatus())) {
            throw new BadRequestException("This assessment has already been submitted and cannot be edited.");
        }
    }

    private String canonicalRole(String value) {
        if (value == null) {
            return "";
        }

        String normalized = value
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("([a-z])([A-Z])", "$1_$2")
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase(Locale.ROOT);

        if (normalized.equals("DEPARTMENTHEAD")) {
            return "DEPARTMENT_HEAD";
        }

        return normalized;
    }

    private String roleFromDashboard(String dashboard) {
        if (dashboard == null || dashboard.isBlank()) {
            return null;
        }

        return switch (dashboard) {
            case "ADMIN_DASHBOARD" -> "ADMIN";
            case "HR_DASHBOARD" -> "HR";
            case "MANAGER_DASHBOARD" -> "MANAGER";
            case "DEPARTMENT_HEAD_DASHBOARD" -> "DEPARTMENT_HEAD";
            case "EXECUTIVE_DASHBOARD" -> "EXECUTIVE";
            case "EMPLOYEE_DASHBOARD" -> "EMPLOYEE";
            default -> null;
        };
    }

    private void validateRequestFormMatchesAssignedForm(AssessmentRequest request, AssessmentFormDefinition form) {
        if (request == null) {
            throw new BadRequestException("Assessment request body is required.");
        }

        Integer requestFormId = request.getAssessmentFormId() != null
                ? request.getAssessmentFormId()
                : request.getFormId();

        if (requestFormId != null && !Objects.equals(requestFormId, form.getId())) {
            throw new BadRequestException("This self-assessment form is not assigned to your role.");
        }
    }

    private void validateAssessmentBelongsToAssignedForm(EmployeeAssessment assessment, AssessmentFormDefinition form) {
        if (assessment.getAssessmentFormId() == null) {
            throw new BadRequestException("This old draft was created before HR form targeting was enabled. Please create a new draft.");
        }

        if (!Objects.equals(assessment.getAssessmentFormId(), form.getId())) {
            throw new BadRequestException("This draft does not belong to the active HR self-assessment form assigned to your role.");
        }
    }

    private String resolveResponseType(String responseType) {
        String normalized = responseType == null || responseType.isBlank()
                ? RESPONSE_TYPE_YES_NO_RATING
                : responseType.trim().toUpperCase(Locale.ROOT);

        if (!normalized.equals(RESPONSE_TYPE_RATING)
                && !normalized.equals(RESPONSE_TYPE_TEXT)
                && !normalized.equals(RESPONSE_TYPE_YES_NO)
                && !normalized.equals(RESPONSE_TYPE_YES_NO_RATING)) {
            return RESPONSE_TYPE_YES_NO_RATING;
        }

        return normalized;
    }

    private Double normalizeWeight(Double weight) {
        if (weight == null || weight < 1) {
            return 1.0;
        }

        return weight;
    }

    private String normalizeRequired(String value, String message) {
        String normalized = normalizeOptional(value);

        if (normalized == null) {
            throw new BadRequestException(message);
        }

        return normalized;
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String clean(String value) {
        return normalizeOptional(value);
    }

    private String stableItemKey(String sectionTitle, String questionText, Integer itemOrder) {
        return String.join("|",
                normalizeOptional(sectionTitle) == null ? "" : normalizeOptional(sectionTitle).toLowerCase(Locale.ROOT),
                normalizeOptional(questionText) == null ? "" : normalizeOptional(questionText).toLowerCase(Locale.ROOT),
                itemOrder == null ? "" : itemOrder.toString()
        );
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private double nullToZero(Double value) {
        return value == null ? 0.0 : value;
    }

    private record EmployeeProfile(
            Integer employeeId,
            String employeeName,
            String employeeCode,
            String currentPosition,
            Integer departmentId,
            String departmentName,
            Integer managerUserId,
            String managerName
    ) {
    }
}