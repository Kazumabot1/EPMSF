package com.epms.repository;

import com.epms.entity.EmployeeAssessmentAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EmployeeAssessmentAnswerRepository extends JpaRepository<EmployeeAssessmentAnswer, Long> {

    @Query("""
            select answer
            from EmployeeAssessmentAnswer answer
            where answer.assessment.id = :assessmentId
            order by answer.sectionTitle asc, answer.itemOrder asc, answer.id asc
            """)
    List<EmployeeAssessmentAnswer> findByAssessmentIdOrderBySectionTitleAscItemOrderAscIdAsc(
            @Param("assessmentId") Long assessmentId
    );
}
