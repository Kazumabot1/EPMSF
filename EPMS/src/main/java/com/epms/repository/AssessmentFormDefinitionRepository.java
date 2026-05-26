package com.epms.repository;

import com.epms.entity.AssessmentFormDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AssessmentFormDefinitionRepository extends JpaRepository<AssessmentFormDefinition, Integer> {

    boolean existsByFormNameIgnoreCase(String formName);

    boolean existsByFormNameIgnoreCaseAndIdNot(String formName, Integer id);

    List<AssessmentFormDefinition> findAllByOrderByCreatedAtDesc();

    @Query("""
            select form
            from AssessmentFormDefinition form
            where form.active = true
              and (form.startDate is null or form.startDate <= :startDate)
              and (form.endDate is null or form.endDate >= :endDate)
            order by form.createdAt desc
            """)
    List<AssessmentFormDefinition> findByActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByCreatedAtDesc(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query("""
            select form
            from AssessmentFormDefinition form
            where form.active = true
              and (:currentFormId is null or form.id <> :currentFormId)
              and form.startDate is not null
              and form.endDate is not null
              and form.startDate <= :endDate
              and form.endDate >= :startDate
            order by form.createdAt desc
            """)
    List<AssessmentFormDefinition> findActiveFormsOverlapping(
            @Param("currentFormId") Integer currentFormId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );
}