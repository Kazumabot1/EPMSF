package com.epms.service;

import com.epms.dto.appraisal.AppraisalReviewSubmitRequest;
import com.epms.dto.appraisal.EmployeeAppraisalFormResponse;
import com.epms.dto.appraisal.AppraisalEmployeeOptionResponse;
import com.epms.dto.appraisal.PmAppraisalSubmitRequest;

import java.util.List;

public interface EmployeeAppraisalWorkflowService {

    List<AppraisalEmployeeOptionResponse> getPmEligibleEmployees(Integer cycleId, Integer pmUserId);

    EmployeeAppraisalFormResponse createPmDraft(Integer cycleId, Integer employeeId, Integer pmUserId);

    EmployeeAppraisalFormResponse savePmDraft(Integer employeeAppraisalFormId, PmAppraisalSubmitRequest request, Integer pmUserId);

    EmployeeAppraisalFormResponse submitPmReview(Integer employeeAppraisalFormId, PmAppraisalSubmitRequest request, Integer pmUserId);

    EmployeeAppraisalFormResponse saveDeptHeadDraft(Integer employeeAppraisalFormId, AppraisalReviewSubmitRequest request, Integer deptHeadUserId);

    EmployeeAppraisalFormResponse submitDeptHeadReview(Integer employeeAppraisalFormId, AppraisalReviewSubmitRequest request, Integer deptHeadUserId);

    EmployeeAppraisalFormResponse saveHrDraft(Integer employeeAppraisalFormId, AppraisalReviewSubmitRequest request, Integer hrUserId);

    EmployeeAppraisalFormResponse approveByHr(Integer employeeAppraisalFormId, AppraisalReviewSubmitRequest request, Integer hrUserId);

    EmployeeAppraisalFormResponse returnToPm(Integer employeeAppraisalFormId, String note, Integer actionByUserId);

    EmployeeAppraisalFormResponse getForm(Integer employeeAppraisalFormId);

    List<EmployeeAppraisalFormResponse> getPmHistory(Integer pmUserId);

    List<EmployeeAppraisalFormResponse> getDeptHeadQueue(Integer departmentId);

    List<EmployeeAppraisalFormResponse> getDeptHeadHistory(Integer deptHeadUserId);

    List<EmployeeAppraisalFormResponse> getHrReviewQueue();

    List<EmployeeAppraisalFormResponse> getHrReviewedRecords();

    List<EmployeeAppraisalFormResponse> getEmployeeVisibleForms(Integer employeeId);
}
