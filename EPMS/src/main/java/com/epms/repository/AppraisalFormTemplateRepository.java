package com.epms.repository;

import com.epms.entity.AppraisalFormTemplate;
import com.epms.entity.enums.AppraisalCycleType;
import com.epms.entity.enums.AppraisalTemplateStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AppraisalFormTemplateRepository extends JpaRepository<AppraisalFormTemplate, Integer> {

    List<AppraisalFormTemplate> findByStatus(AppraisalTemplateStatus status);

    List<AppraisalFormTemplate> findByCycleSpecificCopyFalse();

    List<AppraisalFormTemplate> findByStatusAndCycleSpecificCopyFalse(AppraisalTemplateStatus status);

    List<AppraisalFormTemplate> findByFormType(AppraisalCycleType formType);

    boolean existsByTemplateNameIgnoreCase(String templateName);

    boolean existsByTemplateNameIgnoreCaseAndIdNot(String templateName, Integer id);

    boolean existsByTemplateNameIgnoreCaseAndCycleSpecificCopyFalse(String templateName);

    boolean existsByTemplateNameIgnoreCaseAndCycleSpecificCopyFalseAndIdNot(String templateName, Integer id);

    @EntityGraph(attributePaths = {"targetDepartments", "targetDepartments.department"})
    @Query("SELECT t FROM AppraisalFormTemplate t WHERE t.id = :templateId")
    Optional<AppraisalFormTemplate> findWithTargetDepartmentsById(@Param("templateId") Integer templateId);

    @Query("""
        SELECT DISTINCT t
        FROM AppraisalFormTemplate t
        LEFT JOIN FETCH t.sections s
        WHERE t.id = :templateId
        ORDER BY s.sortOrder ASC
        """)
    Optional<AppraisalFormTemplate> findByIdWithSections(@Param("templateId") Integer templateId);

    @Query("""
        SELECT DISTINCT t
        FROM AppraisalFormTemplate t
        LEFT JOIN FETCH t.targetDepartments td
        LEFT JOIN FETCH td.department
        WHERE t.id = :templateId
        """)
    Optional<AppraisalFormTemplate> findByIdWithDepartments(@Param("templateId") Integer templateId);
}
