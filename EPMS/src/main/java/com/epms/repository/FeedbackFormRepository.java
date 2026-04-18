package com.epms.repository;

import com.epms.entity.FeedbackForm;
import com.epms.entity.enums.FeedbackFormStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FeedbackFormRepository extends JpaRepository<FeedbackForm, Long> {

    List<FeedbackForm> findByStatus(FeedbackFormStatus status);

    Page<FeedbackForm> findByStatus(FeedbackFormStatus status, Pageable pageable);

    List<FeedbackForm> findByAnonymousAllowed(Boolean anonymousAllowed);

    List<FeedbackForm> findByCreatedByUserId(Long createdByUserId);

    Page<FeedbackForm> findByCreatedByUserId(Long createdByUserId, Pageable pageable);

    /**
     * Fetch full feedback form structure (form -> section -> question).
     * Uses JOIN FETCH to avoid N+1 query problem when rendering a form.
     */
    @Query("SELECT DISTINCT f FROM FeedbackForm f " +
           "LEFT JOIN FETCH f.sections s " +
           "LEFT JOIN FETCH s.questions " +
           "WHERE f.id = :formId")
    Optional<FeedbackForm> findByIdWithSectionsAndQuestions(@Param("formId") Long formId);
}
