package com.epms.repository;

import com.epms.entity.SelfAssessmentScoreBand;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SelfAssessmentScoreBandRepository extends JpaRepository<SelfAssessmentScoreBand, Integer> {

    List<SelfAssessmentScoreBand> findAllByOrderBySortOrderAsc();

    boolean existsBySortOrder(Integer sortOrder);
}