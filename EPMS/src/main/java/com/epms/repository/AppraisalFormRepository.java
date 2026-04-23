package com.epms.repository;

import com.epms.entity.AppraisalForm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AppraisalFormRepository extends JpaRepository<AppraisalForm, Long> {
}
