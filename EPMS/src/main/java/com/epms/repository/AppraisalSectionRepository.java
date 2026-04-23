package com.epms.repository;

import com.epms.entity.AppraisalSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AppraisalSectionRepository extends JpaRepository<AppraisalSection, Long> {
}
