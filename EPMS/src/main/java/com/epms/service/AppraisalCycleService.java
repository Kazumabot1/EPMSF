package com.epms.service;

import com.epms.dto.appraisal.AppraisalCycleRequest;
import com.epms.dto.appraisal.AppraisalCycleResponse;
import com.epms.dto.appraisal.AppraisalTemplateCycleRequest;
import com.epms.entity.enums.AppraisalCycleStatus;

import java.util.List;

public interface AppraisalCycleService {

    AppraisalCycleResponse createCycle(AppraisalCycleRequest request, Integer createdByUserId);

    AppraisalCycleResponse createTemplateAndCycle(AppraisalTemplateCycleRequest request, Integer createdByUserId);

    AppraisalCycleResponse getCycle(Integer cycleId);

    AppraisalCycleResponse updateDraftCycle(Integer cycleId, AppraisalCycleRequest request, Integer updatedByUserId);

    List<AppraisalCycleResponse> getCycles(AppraisalCycleStatus status);

    AppraisalCycleResponse activateCycle(Integer cycleId);

    AppraisalCycleResponse deactivateCycle(Integer cycleId);

    AppraisalCycleResponse lockCycle(Integer cycleId);

    AppraisalCycleResponse completeCycle(Integer cycleId);

    AppraisalCycleResponse reuseCycle(Integer cycleId, AppraisalCycleRequest overrideRequest, Integer createdByUserId);

    int autoLockExpiredActiveCycles();

    int sendUpcomingDeadlineNotifications();

}
