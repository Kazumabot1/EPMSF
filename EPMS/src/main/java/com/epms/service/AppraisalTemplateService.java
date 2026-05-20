package com.epms.service;

import com.epms.dto.appraisal.AppraisalTemplateRequest;
import com.epms.dto.appraisal.AppraisalTemplateResponse;
import com.epms.entity.enums.AppraisalTemplateStatus;

import java.util.List;

public interface AppraisalTemplateService {

    AppraisalTemplateResponse createTemplate(AppraisalTemplateRequest request, Integer createdByUserId);

    AppraisalTemplateResponse updateDraftTemplate(Integer templateId, AppraisalTemplateRequest request, Integer updatedByUserId);

    AppraisalTemplateResponse getTemplate(Integer templateId);

    List<AppraisalTemplateResponse> getTemplates(AppraisalTemplateStatus status);

    AppraisalTemplateResponse activateTemplate(Integer templateId);

    AppraisalTemplateResponse archiveTemplate(Integer templateId);

}
