package com.epms.service;

import com.epms.dto.FeedbackCompetencyResponse;
import com.epms.dto.FeedbackCompetencyUpsertRequest;

import java.util.List;

public interface FeedbackCompetencyService {

    List<FeedbackCompetencyResponse> getCompetencies();

    FeedbackCompetencyResponse createCompetency(FeedbackCompetencyUpsertRequest request);

    FeedbackCompetencyResponse updateCompetency(Long competencyId, FeedbackCompetencyUpsertRequest request);
}
