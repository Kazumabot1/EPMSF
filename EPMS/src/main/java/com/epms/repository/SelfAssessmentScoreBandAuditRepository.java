package com.epms.repository;

import com.epms.entity.SelfAssessmentScoreBandAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SelfAssessmentScoreBandAuditRepository extends JpaRepository<SelfAssessmentScoreBandAudit, Long> {

    List<SelfAssessmentScoreBandAudit> findTop100ByOrderByChangedAtDesc();
}