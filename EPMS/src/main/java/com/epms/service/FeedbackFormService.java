package com.epms.service;

import com.epms.entity.FeedbackForm;
import java.util.List;

public interface FeedbackFormService {
    FeedbackForm createForm(FeedbackForm form);
    FeedbackForm getFormById(Long formId);
    List<FeedbackForm> getAllActiveForms();
}
