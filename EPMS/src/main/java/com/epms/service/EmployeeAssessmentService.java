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
import com.epms.entity.AssessmentFormSectionDefinition;
import com.epms.entity.Department;
import com.epms.entity.Employee;
import com.epms.entity.EmployeeAssessment;
import com.epms.entity.EmployeeAssessmentAnswer;
import com.epms.entity.Signature;
import com.epms.entity.Team;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.entity.enums.AssessmentStatus;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.exception.UnauthorizedActionException;
import com.epms.repository.AssessmentFormDefinitionRepository;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.EmployeeAssessmentRepository;
import com.epms.repository.EmployeeAssessmentAnswerRepository;
import com.epms.repository.EmployeeDepartmentRepository;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.SignatureRepository;
import com.epms.repository.TeamMemberRepository;
import com.epms.repository.UserRepository;
import com.epms.security.SecurityUtils;
import com.epms.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmployeeAssessmentService {

    private static final int MAX_RATING = 5;
    private static final String RESPONSE_TYPE_YES_NO_RATING = "YES_NO_RATING";

    private static final List<AssessmentStatus> EMPLOYEE_VISIBLE_STATUSES = List.of(
            AssessmentStatus.DRAFT,
            AssessmentStatus.SUBMITTED,
            AssessmentStatus.PENDING_MANAGER,
            AssessmentStatus.PENDING_DEPARTMENT_HEAD,
            AssessmentStatus.PENDING_HR,
            AssessmentStatus.APPROVED,
            AssessmentStatus.DECLINED,
            AssessmentStatus.REJECTED,
            AssessmentStatus.CLOSED_REJECTED
    );

    private static final List<AssessmentStatus> REVIEW_TABLE_STATUSES = List.of(
            AssessmentStatus.SUBMITTED,
            AssessmentStatus.PENDING_MANAGER,
            AssessmentStatus.PENDING_DEPARTMENT_HEAD,
            AssessmentStatus.PENDING_HR,
            AssessmentStatus.APPROVED,
            AssessmentStatus.DECLINED,
            AssessmentStatus.REJECTED,
            AssessmentStatus.CLOSED_REJECTED
    );

    private static final List<AssessmentStatus> NON_EDITABLE_STATUSES = List.of(
            AssessmentStatus.SUBMITTED,
            AssessmentStatus.PENDING_MANAGER,
            AssessmentStatus.PENDING_DEPARTMENT_HEAD,
            AssessmentStatus.PENDING_HR,
            AssessmentStatus.APPROVED,
            AssessmentStatus.DECLINED,
            AssessmentStatus.REJECTED,
            AssessmentStatus.CLOSED_REJECTED
    );

    private final EmployeeAssessmentRepository assessmentRepository;
    private final EmployeeAssessmentAnswerRepository assessmentAnswerRepository;
    private final JdbcTemplate jdbcTemplate;
    private final AssessmentFormDefinitionRepository formRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final SignatureRepository signatureRepository;
    private final EmployeeDepartmentRepository employeeDepartmentRepository;
    private final PositionPermissionService positionPermissionService;
    private final SelfAssessmentScoreBandService selfAssessmentScoreBandService;
    private final TeamMemberRepository teamMemberRepository;

    @Transactional(readOnly = true)
    public AssessmentResponse getTemplateForCurrentUser() {
        User user = currentUserEntity();

        AssessmentFormDefinition form;

        try {
            form = findAssignedActiveFormForCurrentUser();
        } catch (RuntimeException e) {
            Optional<EmployeeAssessment> latestExistingAssessment = assessmentRepository
                    .findByUserIdOrderByUpdatedAtDesc(user.getId())
                    .stream()
                    .filter(assessment -> assessment.getStatus() != null)
                    .filter(assessment -> !AssessmentStatus.DRAFT.equals(assessment.getStatus()))
                    .findFirst();

            if (latestExistingAssessment.isPresent()) {
                return toResponse(latestExistingAssessment.get());
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
        return getByIdSnapshot(id);
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

        applyRequest(assessment, request, AssessmentStatus.PENDING_MANAGER, form);
        validateComplete(assessment);
        calculateScores(assessment, form);
        attachEmployeeSignature(assessment);

        applyInitialManagerRouting(assessment);

        assessment.setStatus(AssessmentStatus.PENDING_MANAGER);
        assessment.setSubmittedAt(LocalDateTime.now());
        assessment.setApprovedAt(null);
        assessment.setDeclinedAt(null);

        return toResponse(assessmentRepository.save(assessment));
    }

    @Transactional
    public AssessmentResponse managerRemark(Long id, ReviewActionRequest request) {
        EmployeeAssessment assessment = findAssessment(id);
        UserPrincipal principal = SecurityUtils.currentUser();

        if (!isEligibleManagerReviewer(assessment, principal)) {
            throw new UnauthorizedActionException("Only an eligible manager can sign this self-assessment.");
        }

        if (!AssessmentStatus.PENDING_MANAGER.equals(assessment.getStatus())
                && !AssessmentStatus.SUBMITTED.equals(assessment.getStatus())) {
            throw new BadRequestException("Manager can sign only while the assessment is waiting for manager review.");
        }

        User manager = currentUserEntity();
        Signature signature = currentDefaultSignature();

        assessment.setManagerUserId(manager.getId());
        assessment.setManagerName(normalizeOptional(manager.getFullName()) == null
                ? manager.getEmail()
                : manager.getFullName());
        assessment.setManagerComment(clean(request == null ? null : request.getComment()));
        assessment.setManagerSignatureId(signature.getId());
        assessment.setManagerSignatureName(signature.getName());
        assessment.setManagerSignatureImageData(signature.getImageData());
        assessment.setManagerSignatureImageType(signature.getImageType());
        assessment.setManagerSignedAt(LocalDateTime.now());
        assessment.setStatus(AssessmentStatus.PENDING_HR);

        return toResponse(assessmentRepository.save(assessment));
    }

    @Transactional
    public AssessmentResponse managerSign(Long id, ReviewActionRequest request) {
        return managerRemark(id, request);
    }

    @Transactional
    public AssessmentResponse managerDecline(Long id, ReviewActionRequest request) {
        EmployeeAssessment assessment = findAssessment(id);
        UserPrincipal principal = SecurityUtils.currentUser();

        if (!isEligibleManagerReviewer(assessment, principal)) {
            throw new UnauthorizedActionException("Only an eligible manager can reject this self-assessment.");
        }

        if (!AssessmentStatus.PENDING_MANAGER.equals(assessment.getStatus())
                && !AssessmentStatus.SUBMITTED.equals(assessment.getStatus())) {
            throw new BadRequestException("Manager can reject only while the assessment is waiting for manager review.");
        }

        String reason = requiredReason(request, "Manager rejection reason is required.");
        String comment = clean(request == null ? null : request.getComment());

        if (canEmployeeReviseAfterRejection(assessment)) {
            reopenRejectedAssessmentForEmployeeRevision(assessment, reason, comment, false);
        } else {
            closeRejectedAssessment(assessment, reason, comment, false);
        }

        return toResponse(assessmentRepository.save(assessment));
    }

    @Transactional
    public AssessmentResponse departmentHeadSign(Long id, ReviewActionRequest request) {
        throw new BadRequestException("Department Head can only view self-assessment forms. Department Head signature is not required in the current self-assessment workflow.");
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

        if (assessment.getManagerSignatureId() == null || assessment.getManagerSignedAt() == null) {
            throw new BadRequestException("HR cannot approve until manager signature is completed.");
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
        assessment.setDeclinedAt(null);

        return toResponse(assessmentRepository.save(assessment));
    }

    @Transactional
    public AssessmentResponse hrDecline(Long id, ReviewActionRequest request) {
        EmployeeAssessment assessment = findAssessment(id);
        UserPrincipal principal = SecurityUtils.currentUser();
        Set<String> roles = currentUserTargetRoles(principal);

        if (!roles.contains("HR") && !roles.contains("ADMIN")) {
            throw new UnauthorizedActionException("Only HR can reject this self-assessment.");
        }

        if (AssessmentStatus.DRAFT.equals(assessment.getStatus())) {
            throw new BadRequestException("HR cannot reject a draft assessment.");
        }

        if (AssessmentStatus.APPROVED.equals(assessment.getStatus())) {
            throw new BadRequestException("Approved assessments cannot be rejected.");
        }

        if (AssessmentStatus.CLOSED_REJECTED.equals(assessment.getStatus())) {
            throw new BadRequestException("This assessment is already closed as rejected.");
        }

        String reason = requiredReason(request, "HR rejection reason is required.");
        String comment = clean(request == null ? null : request.getComment());

        if (canEmployeeReviseAfterRejection(assessment)) {
            reopenRejectedAssessmentForEmployeeRevision(assessment, reason, comment, true);
        } else {
            closeRejectedAssessment(assessment, reason, comment, true);
        }

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
            Map<Long, EmployeeAssessment> visible = new LinkedHashMap<>();

            assessmentRepository
                    .findByStatusInAndManagerUserIdOrderBySubmittedAtDesc(
                            REVIEW_TABLE_STATUSES,
                            principal.getId()
                    )
                    .forEach(assessment -> visible.put(assessment.getId(), assessment));

            for (EmployeeAssessment assessment : assessmentRepository.findByStatusInOrderBySubmittedAtDesc(REVIEW_TABLE_STATUSES)) {
                if (isEligibleManagerReviewer(assessment, principal)) {
                    visible.put(assessment.getId(), assessment);
                }
            }

            return visible.values()
                    .stream()
                    .sorted(Comparator.comparing(
                            EmployeeAssessment::getSubmittedAt,
                            Comparator.nullsLast(Comparator.reverseOrder())
                    ))
                    .map(this::toScoreRow)
                    .toList();
        }

        if (isDepartmentHeadRole(roles)) {
            if (!positionPermissionService.currentUserHasPermission("selfAssessmentView")) {
                throw new UnauthorizedActionException("Your position does not have permission to view self-assessments.");
            }

            Map<Long, EmployeeAssessment> visible = new LinkedHashMap<>();

            for (Integer departmentId : currentUserDepartmentIds(principal)) {
                assessmentRepository
                        .findByStatusInAndDepartmentIdOrderBySubmittedAtDesc(
                                REVIEW_TABLE_STATUSES,
                                departmentId
                        )
                        .forEach(assessment -> visible.put(assessment.getId(), assessment));
            }

            return visible.values()
                    .stream()
                    .sorted(Comparator.comparing(
                            EmployeeAssessment::getSubmittedAt,
                            Comparator.nullsLast(Comparator.reverseOrder())
                    ))
                    .map(this::toScoreRow)
                    .toList();
        }

        return getMyScores();
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
                .departmentHeadUserId(null)
                .departmentHeadName(null)
                .assessmentFormId(form.getId())
                .formName(form.getFormName())
                .companyName(form.getCompanyName() == null || form.getCompanyName().isBlank()
                        ? "ACE Data Systems Ltd."
                        : form.getCompanyName())
                .assessmentDate(LocalDate.now())
                .period(String.valueOf(LocalDate.now().getYear()))
                .status(AssessmentStatus.DRAFT)
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

        assessment.setAssessmentFormId(form.getId());
        assessment.setFormName(form.getFormName());
        assessment.setCompanyName(form.getCompanyName() == null || form.getCompanyName().isBlank()
                ? "ACE Data Systems Ltd."
                : form.getCompanyName());
        assessment.setPeriod(normalizeOptional(request.getPeriod()) == null
                ? String.valueOf(LocalDate.now().getYear())
                : normalizeOptional(request.getPeriod()));
        assessment.setRemarks(clean(request.getRemarks()));
        assessment.setStatus(status);
        assessment.setAssessmentDate(LocalDate.now());

        Map<String, AssessmentItemRequest> requestByKey = request.getItems() == null
                ? Map.of()
                : request.getItems()
                .stream()
                .collect(Collectors.toMap(
                        item -> stableItemKey(item.getSectionTitle(), item.getQuestionText(), item.getItemOrder()),
                        item -> item,
                        (first, ignored) -> first,
                        LinkedHashMap::new
                ));

        assessment.getAnswers().clear();

        int itemOrder = 1;

        for (AssessmentFormSectionDefinition section : sortedSections(form)) {
            for (AssessmentFormQuestionDefinition question : safeQuestions(section)) {
                AssessmentItemRequest incoming = requestByKey.get(stableItemKey(
                        section.getTitle(),
                        question.getQuestionText(),
                        itemOrder
                ));

                Integer rating = incoming == null ? null : incoming.getRating();
                Boolean yesNoAnswer = incoming == null ? null : incoming.getYesNoAnswer();

                EmployeeAssessmentAnswer answer = EmployeeAssessmentAnswer.builder()
                        .assessment(assessment)
                        .questionId(question.getId())
                        .sectionTitle(normalizeRequired(section.getTitle(), "Section title is required."))
                        .questionText(normalizeRequired(question.getQuestionText(), "Question text is required."))
                        .itemOrder(itemOrder)
                        .responseType(RESPONSE_TYPE_YES_NO_RATING)
                        .required(question.getRequired() == null || question.getRequired())
                        .weight(1.0)
                        .rating(rating)
                        .maxRating(MAX_RATING)
                        .comment("")
                        .yesNoAnswer(yesNoAnswer)
                        .build();

                assessment.addAnswer(answer);
                itemOrder++;
            }
        }
    }

    private void validateComplete(EmployeeAssessment assessment) {
        List<EmployeeAssessmentAnswer> answers = assessment.getAnswers() == null
                ? List.of()
                : assessment.getAnswers();

        if (answers.isEmpty()) {
            throw new BadRequestException("This assessment form has no questions.");
        }

        for (EmployeeAssessmentAnswer answer : answers) {
            boolean required = answer.getRequired() == null || answer.getRequired();

            if (!required) {
                continue;
            }

            if (answer.getYesNoAnswer() == null || answer.getRating() == null) {
                throw new BadRequestException("Please answer Yes/No and Rating for all required subjects.");
            }

            if (answer.getRating() < 1 || answer.getRating() > MAX_RATING) {
                throw new BadRequestException("Rating must be between 1 and 5.");
            }
        }
    }

    private void calculateScores(EmployeeAssessment assessment, AssessmentFormDefinition form) {
        double total = 0.0;
        double max = 0.0;

        if (assessment.getAnswers() != null) {
            for (EmployeeAssessmentAnswer answer : assessment.getAnswers()) {
                if (answer.getRating() == null) {
                    continue;
                }

                double weight = answer.getWeight() == null ? 1.0 : answer.getWeight();
                total += answer.getRating() * weight;
                max += MAX_RATING * weight;
            }
        }

        double percent = max <= 0 ? 0.0 : round2((total / max) * 100.0);

        assessment.setTotalScore(round2(total));
        assessment.setMaxScore(round2(max));
        assessment.setScorePercent(percent);
        assessment.setPerformanceLabel(scoreLabel(percent, form));
    }

    private String scoreLabel(double scorePercent, AssessmentFormDefinition form) {
        List<AssessmentScoreBandResponse> bands = safeScoreBands();

        return bands.stream()
                .filter(band -> scorePercent >= band.getMinScore() && scorePercent <= band.getMaxScore())
                .findFirst()
                .map(AssessmentScoreBandResponse::getLabel)
                .orElse("Not scored");
    }


    private AssessmentResponse getByIdSnapshot(Long id) {
        Map<String, Object> row;

        try {
            row = jdbcTemplate.queryForMap("""
                    select
                        id,
                        user_id,
                        employee_id,
                        employee_name,
                        employee_code,
                        current_position,
                        department_id,
                        department_name,
                        manager_user_id,
                        manager_name,
                        department_head_user_id,
                        department_head_name,
                        assessment_form_id,
                        form_name,
                        company_name,
                        assessment_date,
                        period_label,
                        status,
                        total_score,
                        max_score,
                        score_percent,
                        performance_label,
                        remarks,
                        manager_comment,
                        hr_comment,
                        department_head_comment,
                        decline_reason,
                        employee_signature_id,
                        employee_signature_name,
                        employee_signature_image_data,
                        employee_signature_image_type,
                        employee_signed_at,
                        manager_signature_id,
                        manager_signature_name,
                        manager_signature_image_data,
                        manager_signature_image_type,
                        manager_signed_at,
                        department_head_signature_id,
                        department_head_signature_name,
                        department_head_signature_image_data,
                        department_head_signature_image_type,
                        department_head_signed_at,
                        hr_signature_id,
                        hr_signature_name,
                        hr_signature_image_data,
                        hr_signature_image_type,
                        hr_signed_at,
                        created_at,
                        updated_at,
                        submitted_at,
                        approved_at,
                        declined_at
                    from employee_assessments
                    where id = ?
                    """, id);
        } catch (EmptyResultDataAccessException ex) {
            throw new ResourceNotFoundException("Assessment not found.");
        }

        Integer ownerUserId = toInteger(row.get("user_id"));
        Integer employeeId = toInteger(row.get("employee_id"));
        Integer managerUserId = toInteger(row.get("manager_user_id"));
        Integer departmentId = toInteger(row.get("department_id"));

        assertCanViewSnapshot(ownerUserId, employeeId, managerUserId, departmentId);

        List<Map<String, Object>> answerRows = jdbcTemplate.queryForList("""
                select
                    id,
                    question_id,
                    section_title,
                    question_text,
                    item_order,
                    response_type,
                    is_required,
                    weight,
                    rating,
                    max_rating,
                    comment,
                    yes_no_answer
                from employee_assessment_answers
                where assessment_id = ?
                order by coalesce(item_order, 999999), id
                """, id);

        return AssessmentResponse.builder()
                .id(toLong(row.get("id")))
                .formId(toInteger(row.get("assessment_form_id")))
                .assessmentFormId(toInteger(row.get("assessment_form_id")))
                .formName(toStringValue(row.get("form_name")))
                .companyName(toStringValue(row.get("company_name")))
                .userId(ownerUserId)
                .employeeId(employeeId)
                .employeeName(toStringValue(row.get("employee_name")))
                .employeeCode(toStringValue(row.get("employee_code")))
                .currentPosition(toStringValue(row.get("current_position")))
                .departmentId(departmentId)
                .departmentName(toStringValue(row.get("department_name")))
                .managerUserId(managerUserId)
                .managerName(toStringValue(row.get("manager_name")))
                .departmentHeadUserId(toInteger(row.get("department_head_user_id")))
                .departmentHeadName(toStringValue(row.get("department_head_name")))
                .assessmentDate(toLocalDate(row.get("assessment_date")))
                .period(toStringValue(row.get("period_label")))
                .status(toStringValue(row.get("status")))
                .totalScore(nullToZero(toDouble(row.get("total_score"))))
                .maxScore(nullToZero(toDouble(row.get("max_score"))))
                .scorePercent(nullToZero(toDouble(row.get("score_percent"))))
                .performanceLabel(toStringValue(row.get("performance_label")))
                .remarks(toStringValue(row.get("remarks")))
                .managerComment(toStringValue(row.get("manager_comment")))
                .hrComment(toStringValue(row.get("hr_comment")))
                .departmentHeadComment(toStringValue(row.get("department_head_comment")))
                .declineReason(toStringValue(row.get("decline_reason")))
                .employeeSignatureId(toLong(row.get("employee_signature_id")))
                .employeeSignatureName(toStringValue(row.get("employee_signature_name")))
                .employeeSignatureImageData(toStringValue(row.get("employee_signature_image_data")))
                .employeeSignatureImageType(toStringValue(row.get("employee_signature_image_type")))
                .employeeSignedAt(toLocalDateTime(row.get("employee_signed_at")))
                .managerSignatureId(toLong(row.get("manager_signature_id")))
                .managerSignatureName(toStringValue(row.get("manager_signature_name")))
                .managerSignatureImageData(toStringValue(row.get("manager_signature_image_data")))
                .managerSignatureImageType(toStringValue(row.get("manager_signature_image_type")))
                .managerSignedAt(toLocalDateTime(row.get("manager_signed_at")))
                .departmentHeadSignatureId(toLong(row.get("department_head_signature_id")))
                .departmentHeadSignatureName(toStringValue(row.get("department_head_signature_name")))
                .departmentHeadSignatureImageData(toStringValue(row.get("department_head_signature_image_data")))
                .departmentHeadSignatureImageType(toStringValue(row.get("department_head_signature_image_type")))
                .departmentHeadSignedAt(toLocalDateTime(row.get("department_head_signed_at")))
                .hrSignatureId(toLong(row.get("hr_signature_id")))
                .hrSignatureName(toStringValue(row.get("hr_signature_name")))
                .hrSignatureImageData(toStringValue(row.get("hr_signature_image_data")))
                .hrSignatureImageType(toStringValue(row.get("hr_signature_image_type")))
                .hrSignedAt(toLocalDateTime(row.get("hr_signed_at")))
                .createdAt(toLocalDateTime(row.get("created_at")))
                .updatedAt(toLocalDateTime(row.get("updated_at")))
                .submittedAt(toLocalDateTime(row.get("submitted_at")))
                .approvedAt(toLocalDateTime(row.get("approved_at")))
                .declinedAt(toLocalDateTime(row.get("declined_at")))
                .sections(groupSectionsFromRows(answerRows))
                .scoreBands(safeScoreBands())
                .build();
    }

    private List<AssessmentSectionResponse> groupSectionsFromRows(List<Map<String, Object>> answerRows) {
        Map<String, List<AssessmentItemResponse>> grouped = new LinkedHashMap<>();

        if (answerRows == null || answerRows.isEmpty()) {
            return List.of();
        }

        for (Map<String, Object> answer : answerRows) {
            String sectionTitle = toStringValue(answer.get("section_title"));
            if (sectionTitle == null || sectionTitle.isBlank()) {
                sectionTitle = "Assessment";
            }

            String responseType = toStringValue(answer.get("response_type"));
            grouped.computeIfAbsent(sectionTitle, ignored -> new ArrayList<>())
                    .add(AssessmentItemResponse.builder()
                            .id(toLong(answer.get("id")))
                            .questionId(toInteger(answer.get("question_id")))
                            .sectionTitle(sectionTitle)
                            .questionText(toStringValue(answer.get("question_text")))
                            .itemOrder(toInteger(answer.get("item_order")))
                            .responseType(responseType == null ? RESPONSE_TYPE_YES_NO_RATING : responseType)
                            .isRequired(toBoolean(answer.get("is_required"), true))
                            .weight(toDouble(answer.get("weight")) == null ? 1.0 : toDouble(answer.get("weight")))
                            .rating(toInteger(answer.get("rating")))
                            .maxRating(toInteger(answer.get("max_rating")) == null ? MAX_RATING : toInteger(answer.get("max_rating")))
                            .comment(toStringValue(answer.get("comment")))
                            .yesNoAnswer(toBoolean(answer.get("yes_no_answer"), null))
                            .build());
        }

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

    private void assertCanViewSnapshot(
            Integer ownerUserId,
            Integer employeeId,
            Integer managerUserId,
            Integer departmentId
    ) {
        UserPrincipal principal = SecurityUtils.currentUser();
        Integer currentUserId = SecurityUtils.currentUserId();

        if (sameId(ownerUserId, currentUserId)) {
            return;
        }

        if (currentUserId != null && employeeId != null) {
            Optional<User> currentUser = userRepository.findById(currentUserId);
            if (currentUser.isPresent() && sameId(employeeId, currentUser.get().getEmployeeId())) {
                return;
            }
        }

        Set<String> roles = currentUserTargetRoles(principal);

        if (roles.contains("HR") || roles.contains("ADMIN")) {
            return;
        }

        if (roles.contains("MANAGER")) {
            if (sameId(managerUserId, currentUserId)) {
                return;
            }

            if (ownerUserId != null && currentUserId != null) {
                Optional<User> owner = userRepository.findById(ownerUserId);
                if (owner.isPresent() && sameId(owner.get().getManagerId(), currentUserId)) {
                    return;
                }
            }
        }

        if (isDepartmentHeadRole(roles)
                && departmentId != null
                && currentUserDepartmentIds(principal).contains(departmentId)
                && positionPermissionService.currentUserHasPermission("selfAssessmentView")) {
            return;
        }

        throw new UnauthorizedActionException("You do not have permission to view this assessment.");
    }

    private Integer toInteger(Object value) {
        if (value == null) {
            return null;
        }

        if (value instanceof Number number) {
            return number.intValue();
        }

        try {
            return Integer.parseInt(value.toString());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private Long toLong(Object value) {
        if (value == null) {
            return null;
        }

        if (value instanceof Number number) {
            return number.longValue();
        }

        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private Double toDouble(Object value) {
        if (value == null) {
            return null;
        }

        if (value instanceof Number number) {
            return number.doubleValue();
        }

        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private Boolean toBoolean(Object value, Boolean defaultValue) {
        if (value == null) {
            return defaultValue;
        }

        if (value instanceof Boolean booleanValue) {
            return booleanValue;
        }

        if (value instanceof Number number) {
            return number.intValue() != 0;
        }

        if (value instanceof byte[] bytes && bytes.length > 0) {
            return bytes[0] != 0;
        }

        String normalized = value.toString().trim().toLowerCase(Locale.ROOT);
        if (normalized.equals("true") || normalized.equals("1") || normalized.equals("yes")) {
            return true;
        }
        if (normalized.equals("false") || normalized.equals("0") || normalized.equals("no")) {
            return false;
        }

        return defaultValue;
    }

    private String toStringValue(Object value) {
        return value == null ? null : value.toString();
    }

    private LocalDate toLocalDate(Object value) {
        if (value == null) {
            return null;
        }

        if (value instanceof LocalDate localDate) {
            return localDate;
        }

        if (value instanceof java.sql.Date date) {
            return date.toLocalDate();
        }

        if (value instanceof java.util.Date date) {
            return new java.sql.Date(date.getTime()).toLocalDate();
        }

        try {
            return LocalDate.parse(value.toString());
        } catch (Exception ignored) {
            return null;
        }
    }

    private LocalDateTime toLocalDateTime(Object value) {
        if (value == null) {
            return null;
        }

        if (value instanceof LocalDateTime localDateTime) {
            return localDateTime;
        }

        if (value instanceof java.sql.Timestamp timestamp) {
            return timestamp.toLocalDateTime();
        }

        if (value instanceof java.util.Date date) {
            return new java.sql.Timestamp(date.getTime()).toLocalDateTime();
        }

        try {
            return LocalDateTime.parse(value.toString().replace(" ", "T"));
        } catch (Exception ignored) {
            return null;
        }
    }

    private AssessmentResponse toTemplateResponse(User user, EmployeeProfile profile, AssessmentFormDefinition form) {
        return AssessmentResponse.builder()
                .id(null)
                .formId(form.getId())
                .assessmentFormId(form.getId())
                .formName(form.getFormName())
                .companyName(form.getCompanyName() == null || form.getCompanyName().isBlank()
                        ? "ACE Data Systems Ltd."
                        : form.getCompanyName())
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
                .period(String.valueOf(LocalDate.now().getYear()))
                .status(AssessmentStatus.DRAFT.name())
                .totalScore(0.0)
                .maxScore(0.0)
                .scorePercent(0.0)
                .performanceLabel("Not scored")
                .remarks("")
                .managerComment(null)
                .departmentHeadComment(null)
                .hrComment(null)
                .declineReason(null)
                .sections(templateSectionsFromForm(form))
                .scoreBands(safeScoreBands())
                .build();
    }

    private AssessmentResponse toResponse(EmployeeAssessment assessment) {
        return toResponse(assessment, assessment.getAnswers() == null ? List.of() : assessment.getAnswers());
    }

    private AssessmentResponse toResponse(EmployeeAssessment assessment, List<EmployeeAssessmentAnswer> answers) {
        EmployeeProfile profile = userRepository
                .findById(assessment.getUserId())
                .map(this::resolveProfile)
                .orElse(new EmployeeProfile(
                        assessment.getEmployeeId(),
                        assessment.getEmployeeName(),
                        assessment.getEmployeeCode(),
                        assessment.getCurrentPosition(),
                        assessment.getDepartmentId(),
                        assessment.getDepartmentName(),
                        assessment.getManagerUserId(),
                        assessment.getManagerName()
                ));

        return AssessmentResponse.builder()
                .id(assessment.getId())
                .formId(assessment.getAssessmentFormId())
                .assessmentFormId(assessment.getAssessmentFormId())
                .formName(assessment.getFormName())
                .companyName(assessment.getCompanyName())
                .userId(assessment.getUserId())
                .employeeId(profile.employeeId())
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
                .sections(groupSections(answers))
                .scoreBands(safeScoreBands())
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
                .responseType(RESPONSE_TYPE_YES_NO_RATING)
                .isRequired(question.getRequired() == null || question.getRequired())
                .weight(1.0)
                .rating(null)
                .maxRating(MAX_RATING)
                .comment("")
                .yesNoAnswer(null)
                .build();
    }

    private List<AssessmentSectionResponse> groupSections(List<EmployeeAssessmentAnswer> answers) {
        Map<String, List<AssessmentItemResponse>> grouped = new LinkedHashMap<>();

        if (answers == null) {
            return List.of();
        }

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
                                .responseType(RESPONSE_TYPE_YES_NO_RATING)
                                .isRequired(answer.getRequired() == null || answer.getRequired())
                                .weight(1.0)
                                .rating(answer.getRating())
                                .maxRating(answer.getMaxRating() == null ? MAX_RATING : answer.getMaxRating())
                                .comment("")
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
        LocalDateTime now = LocalDateTime.now();

        return formRepository
                .findByActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByCreatedAtDesc(now, now)
                .stream()
                .filter(form -> formTargetsCurrentUser(form, currentRoles))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No active self-assessment form is available for your role or the form date/time period is closed. Please contact HR."
                ));
    }

    private void ensureFormOpenForSubmission(AssessmentFormDefinition form) {
        LocalDateTime now = LocalDateTime.now();

        if (form == null || !Boolean.TRUE.equals(form.getActive())) {
            throw new BadRequestException("This self-assessment form is not active.");
        }

        if (form.getStartDate() != null && now.isBefore(form.getStartDate())) {
            throw new BadRequestException("This self-assessment form is not open yet.");
        }

        if (form.getEndDate() != null && now.isAfter(form.getEndDate())) {
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

        if (principal == null) {
            return roles;
        }

        if (principal.getRoles() != null) {
            principal.getRoles().forEach(role -> addRoleWithAliases(roles, role));
        }

        String dashboardRole = roleFromDashboard(principal.getDashboard());

        if (dashboardRole != null) {
            addRoleWithAliases(roles, dashboardRole);
        }

        if (principal.getPosition() != null) {
            addRoleWithAliases(roles, principal.getPosition());
        }

        return roles;
    }

    private void addRoleWithAliases(Set<String> roles, String value) {
        String role = canonicalRole(value);

        if (role.isBlank()) {
            return;
        }

        roles.add(role);

        if (role.equals("PROJECT_MANAGER")
                || role.equals("TEAM_MANAGER")
                || role.equals("TEAM_LEADER")
                || role.equals("PM")
                || role.contains("MANAGER")) {
            roles.add("MANAGER");
        }

        if (role.equals("DEPARTMENT_HEAD")
                || role.equals("DEPARTMENTHEAD")
                || role.equals("DEPT_HEAD")
                || role.equals("DEPTHEAD")
                || role.equals("HEAD_OF_DEPARTMENT")
                || role.contains("DEPARTMENT_HEAD")
                || role.contains("DEPARTMENTHEAD")
                || role.contains("DEPT_HEAD")
                || role.contains("DEPTHEAD")
                || role.contains("HEAD_OF_DEPARTMENT")) {
            roles.add("DEPARTMENT_HEAD");
            roles.add("DEPARTMENTHEAD");
            roles.add("DEPT_HEAD");
            roles.add("HEAD_OF_DEPARTMENT");
        }

        if (role.equals("HR")
                || role.equals("HUMAN_RESOURCE")
                || role.equals("HUMAN_RESOURCES")
                || role.contains("HR")
                || role.contains("HUMAN_RESOURCE")) {
            roles.add("HR");
        }

        if (role.equals("ADMIN")) {
            roles.add("ADMIN");
        }

        if (role.equals("EMPLOYEE")) {
            roles.add("EMPLOYEE");
        }
    }

    private boolean isDepartmentHeadRole(Set<String> roles) {
        return roles.contains("DEPARTMENT_HEAD")
                || roles.contains("DEPARTMENTHEAD")
                || roles.contains("DEPT_HEAD")
                || roles.contains("HEAD_OF_DEPARTMENT");
    }


    private List<AssessmentScoreBandResponse> safeScoreBands() {
        try {
            List<AssessmentScoreBandResponse> bands = selfAssessmentScoreBandService.getActiveBandsForAssessment();

            if (bands != null && !bands.isEmpty()) {
                return bands;
            }
        } catch (Exception ignored) {
            // The assessment detail view must not fail only because the score-band setup table is empty or misaligned.
        }

        return defaultScoreBands();
    }

    private List<AssessmentScoreBandResponse> defaultScoreBands() {
        List<AssessmentScoreBandResponse> bands = new ArrayList<>();

        bands.add(defaultScoreBand(86, 100, "Outstanding",
                "Performance exceptional and far exceeds expectations. Consistently demonstrates excellent standards in all job requirements.", 1));
        bands.add(defaultScoreBand(71, 85, "Good",
                "Performance is consistent. Clearly meets essential requirements of job.", 2));
        bands.add(defaultScoreBand(60, 70, "Meet Requirement",
                "Performance is satisfactory. Meets requirements of the job.", 3));
        bands.add(defaultScoreBand(40, 59, "Need Improvement",
                "Performance is inconsistent. Meets requirements of job occasionally. Supervision and training is required for most problem areas.", 4));
        bands.add(defaultScoreBand(0, 39, "Unsatisfactory",
                "Performance does not meet the minimum requirement of the job.", 5));

        return bands;
    }

    private AssessmentScoreBandResponse defaultScoreBand(
            Integer minScore,
            Integer maxScore,
            String label,
            String description,
            Integer sortOrder
    ) {
        return AssessmentScoreBandResponse.builder()
                .minScore(minScore)
                .maxScore(maxScore)
                .label(label)
                .description(description)
                .sortOrder(sortOrder)
                .build();
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
        if (section.getQuestions() == null) {
            return List.of();
        }

        return section.getQuestions()
                .stream()
                .sorted(Comparator.comparing(
                        AssessmentFormQuestionDefinition::getId,
                        Comparator.nullsLast(Integer::compareTo)
                ))
                .toList();
    }

    private EmployeeAssessment findAssessment(Long id) {
        return assessmentRepository
                .findWithAnswersById(id)
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

        if (user.getEmployeeId() != null) {
            Optional<Department> workingDepartment = employeeDepartmentRepository
                    .findActiveAssignmentsForEmployeeId(user.getEmployeeId())
                    .stream()
                    .map(assignment -> assignment.getParentDepartment() != null
                            ? assignment.getParentDepartment()
                            : assignment.getCurrentDepartment())
                    .filter(Objects::nonNull)
                    .filter(department -> department.getId() != null)
                    .findFirst();

            if (workingDepartment.isPresent()) {
                departmentId = workingDepartment.get().getId();
                departmentName = workingDepartment.get().getDepartmentName();
            }
        }

        if (departmentId != null && departmentName == null) {
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

    private Set<Integer> currentUserDepartmentIds(UserPrincipal principal) {
        Set<Integer> departmentIds = new LinkedHashSet<>();

        if (principal != null && principal.getDepartmentId() != null) {
            departmentIds.add(principal.getDepartmentId());
        }

        Integer currentUserId = principal == null ? null : principal.getId();

        if (currentUserId != null) {
            userRepository.findById(currentUserId).ifPresent(user -> {
                if (user.getDepartmentId() != null) {
                    departmentIds.add(user.getDepartmentId());
                }

                if (user.getEmployeeId() != null) {
                    employeeDepartmentRepository
                            .findActiveAssignmentsForEmployeeId(user.getEmployeeId())
                            .forEach(assignment -> {
                                Department parent = assignment.getParentDepartment();
                                Department current = assignment.getCurrentDepartment();

                                if (parent != null && parent.getId() != null) {
                                    departmentIds.add(parent.getId());
                                }

                                if (current != null && current.getId() != null) {
                                    departmentIds.add(current.getId());
                                }
                            });
                }
            });
        }

        return departmentIds;
    }

    private void assertCanView(EmployeeAssessment assessment) {
        UserPrincipal principal = SecurityUtils.currentUser();
        Integer currentUserId = SecurityUtils.currentUserId();

        /*
         * Employee owner check.
         * Use SecurityUtils.currentUserId() because this is the same value used by my-history.
         */
        if (sameId(assessment.getUserId(), currentUserId)) {
            return;
        }

        /*
         * Safety fallback:
         * If the user account was recreated or linked differently, still allow the
         * employee to view their own assessment through employeeId.
         */
        if (currentUserId != null) {
            Optional<User> currentUser = userRepository.findById(currentUserId);

            if (currentUser.isPresent()
                    && sameId(assessment.getEmployeeId(), currentUser.get().getEmployeeId())) {
                return;
            }
        }

        Set<String> roles = currentUserTargetRoles(principal);

        if (roles.contains("HR") || roles.contains("ADMIN")) {
            return;
        }

        if (roles.contains("MANAGER")
                && (isEligibleManagerReviewer(assessment, principal)
                || isDirectReportAssessment(assessment, principal))) {
            return;
        }

        if (isDepartmentHeadRole(roles)
                && currentUserDepartmentIds(principal).contains(assessment.getDepartmentId())
                && positionPermissionService.currentUserHasPermission("selfAssessmentView")) {
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

        if (normalized.equals("DEPARTMENTHEAD")
                || normalized.equals("DEPTHEAD")
                || normalized.equals("DEPT_HEAD")
                || normalized.equals("HEAD_OF_DEPARTMENT")) {
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
            case "DEPARTMENTHEAD_DASHBOARD" -> "DEPARTMENT_HEAD";
            case "DEPT_HEAD_DASHBOARD" -> "DEPARTMENT_HEAD";
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

    private void applyInitialManagerRouting(EmployeeAssessment assessment) {
        if (assessment == null) {
            return;
        }

        List<User> eligibleManagers = eligibleManagersForAssessment(assessment);

        if (eligibleManagers.size() == 1) {
            User manager = eligibleManagers.get(0);

            assessment.setManagerUserId(manager.getId());
            assessment.setManagerName(normalizeOptional(manager.getFullName()) == null
                    ? manager.getEmail()
                    : manager.getFullName());
            return;
        }

        if (eligibleManagers.size() > 1) {
            assessment.setManagerUserId(null);
            assessment.setManagerName("Department Managers");
            return;
        }

        throw new BadRequestException(
                "No eligible manager was found for this employee. Please assign the employee to a team with a manager, or make sure the department has at least one active Manager."
        );
    }

    private List<User> eligibleManagersForAssessment(EmployeeAssessment assessment) {
        if (assessment == null || assessment.getUserId() == null) {
            return List.of();
        }

        Map<Integer, User> managers = new LinkedHashMap<>();

        List<TeamMember> activeMemberships = activeTeamMembershipsForUser(assessment.getUserId());

        /*
         * Case 1:
         * Employee is inside one or more active teams.
         * The form goes to that team Project Manager / Team Leader.
         */
        if (!activeMemberships.isEmpty()) {
            for (TeamMember membership : activeMemberships) {
                Team team = membership.getTeam();

                if (team == null) {
                    continue;
                }

                addIfManager(managers, team.getProjectManager());
                addIfManager(managers, team.getTeamLeader());
            }

            if (!managers.isEmpty()) {
                return new ArrayList<>(managers.values());
            }
        }

        /*
         * Case 2:
         * Employee has no team, or team has no valid manager.
         * Send to all active Manager-role users in the same department.
         */
        if (assessment.getDepartmentId() != null) {
            for (User user : userRepository.findAll()) {
                if (Boolean.FALSE.equals(user.getActive())) {
                    continue;
                }

                if (!userBelongsToDepartment(user, assessment.getDepartmentId())) {
                    continue;
                }

                if (!userHasManagerRole(user)) {
                    continue;
                }

                managers.put(user.getId(), user);
            }
        }

        /*
         * Case 3 fallback:
         * If employee profile already has an assigned manager, use that manager.
         */
        if (managers.isEmpty() && assessment.getManagerUserId() != null) {
            userRepository.findById(assessment.getManagerUserId())
                    .filter(user -> !Boolean.FALSE.equals(user.getActive()))
                    .ifPresent(user -> managers.put(user.getId(), user));
        }

        return new ArrayList<>(managers.values());
    }

    private void addIfManager(Map<Integer, User> managers, User user) {
        if (user == null || user.getId() == null) {
            return;
        }

        if (Boolean.FALSE.equals(user.getActive())) {
            return;
        }

        if (!userHasManagerRole(user)) {
            return;
        }

        managers.put(user.getId(), user);
    }

    private boolean isEligibleManagerReviewer(EmployeeAssessment assessment, UserPrincipal principal) {
        if (assessment == null || principal == null || principal.getId() == null) {
            return false;
        }

        Set<String> roles = currentUserTargetRoles(principal);

        if (!roles.contains("MANAGER")) {
            return false;
        }

        if (assessment.getManagerUserId() != null
                && Objects.equals(assessment.getManagerUserId(), principal.getId())) {
            return true;
        }

        if (isDirectReportAssessment(assessment, principal)) {
            return true;
        }

        return eligibleManagersForAssessment(assessment)
                .stream()
                .anyMatch(manager -> Objects.equals(manager.getId(), principal.getId()));
    }

    private boolean isDirectReportAssessment(EmployeeAssessment assessment, UserPrincipal principal) {
        if (assessment == null || assessment.getUserId() == null || principal == null || principal.getId() == null) {
            return false;
        }

        return userRepository.findById(assessment.getUserId())
                .map(User::getManagerId)
                .filter(Objects::nonNull)
                .map(managerId -> Objects.equals(managerId, principal.getId()))
                .orElse(false);
    }

    private List<TeamMember> activeTeamMembershipsForUser(Integer userId) {
        if (userId == null) {
            return List.of();
        }

        return teamMemberRepository
                .findByMemberUserIdAndEndedDateIsNull(userId)
                .stream()
                .filter(membership -> membership.getTeam() != null)
                .toList();
    }

    private boolean userBelongsToDepartment(User user, Integer departmentId) {
        if (user == null || departmentId == null) {
            return false;
        }

        if (Objects.equals(user.getDepartmentId(), departmentId)) {
            return true;
        }

        if (user.getEmployeeId() == null) {
            return false;
        }

        return employeeDepartmentRepository
                .findActiveAssignmentsForEmployeeId(user.getEmployeeId())
                .stream()
                .anyMatch(assignment -> {
                    Department current = assignment.getCurrentDepartment();
                    Department parent = assignment.getParentDepartment();

                    return (current != null && Objects.equals(current.getId(), departmentId))
                            || (parent != null && Objects.equals(parent.getId(), departmentId));
                });
    }

    private boolean userHasManagerRole(User user) {
        if (user == null) {
            return false;
        }

        Set<String> roles = new LinkedHashSet<>();

        if (user.getDashboard() != null) {
            addRoleWithAliases(roles, roleFromDashboard(user.getDashboard()));
        }

        if (user.getPosition() != null) {
            if (user.getPosition().getRole() != null) {
                addRoleWithAliases(roles, user.getPosition().getRole().getName());
            }

            addRoleWithAliases(roles, user.getPosition().getPositionTitle());
        }

        return roles.contains("MANAGER");
    }

    private boolean canEmployeeReviseAfterRejection(EmployeeAssessment assessment) {
        if (assessment == null || assessment.getAssessmentFormId() == null) {
            return false;
        }

        AssessmentFormDefinition form = formRepository
                .findById(assessment.getAssessmentFormId())
                .orElse(null);

        if (form == null) {
            return false;
        }

        LocalDateTime now = LocalDateTime.now();

        return form.getEndDate() == null || !now.isAfter(form.getEndDate());
    }

    private void reopenRejectedAssessmentForEmployeeRevision(
            EmployeeAssessment assessment,
            String reason,
            String reviewerComment,
            boolean rejectedByHr
    ) {
        assessment.setStatus(AssessmentStatus.DRAFT);
        assessment.setDeclineReason(reason);
        assessment.setDeclinedAt(LocalDateTime.now());
        assessment.setApprovedAt(null);
        assessment.setSubmittedAt(null);

        if (rejectedByHr) {
            assessment.setHrComment(reviewerComment);
        } else {
            assessment.setManagerComment(reviewerComment);
        }

        clearEmployeeSubmissionAndReviewSignatures(assessment);
    }

    private void closeRejectedAssessment(
            EmployeeAssessment assessment,
            String reason,
            String reviewerComment,
            boolean rejectedByHr
    ) {
        assessment.setStatus(AssessmentStatus.CLOSED_REJECTED);
        assessment.setDeclineReason(reason);
        assessment.setDeclinedAt(LocalDateTime.now());
        assessment.setApprovedAt(null);

        if (rejectedByHr) {
            assessment.setHrComment(reviewerComment);
        } else {
            assessment.setManagerComment(reviewerComment);
        }
    }

    private void clearEmployeeSubmissionAndReviewSignatures(EmployeeAssessment assessment) {
        assessment.setEmployeeSignatureId(null);
        assessment.setEmployeeSignatureName(null);
        assessment.setEmployeeSignatureImageData(null);
        assessment.setEmployeeSignatureImageType(null);
        assessment.setEmployeeSignedAt(null);

        assessment.setManagerSignatureId(null);
        assessment.setManagerSignatureName(null);
        assessment.setManagerSignatureImageData(null);
        assessment.setManagerSignatureImageType(null);
        assessment.setManagerSignedAt(null);

        assessment.setDepartmentHeadSignatureId(null);
        assessment.setDepartmentHeadSignatureName(null);
        assessment.setDepartmentHeadSignatureImageData(null);
        assessment.setDepartmentHeadSignatureImageType(null);
        assessment.setDepartmentHeadSignedAt(null);

        assessment.setHrSignatureId(null);
        assessment.setHrSignatureName(null);
        assessment.setHrSignatureImageData(null);
        assessment.setHrSignatureImageType(null);
        assessment.setHrSignedAt(null);

        assessment.setDepartmentHeadUserId(null);
        assessment.setDepartmentHeadName(null);
    }

    private String requiredReason(ReviewActionRequest request, String message) {
        String reason = clean(request == null ? null : request.getReason());

        if (reason == null) {
            throw new BadRequestException(message);
        }

        return reason;
    }

    private boolean sameId(Integer left, Integer right) {
        if (left == null || right == null) {
            return false;
        }

        return Objects.equals(left.longValue(), right.longValue());
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