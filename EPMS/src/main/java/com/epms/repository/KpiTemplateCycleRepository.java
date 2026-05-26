package com.epms.repository;

import com.epms.entity.KpiTemplateCycle;
import com.epms.entity.enums.KpiTemplateCycleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KpiTemplateCycleRepository extends JpaRepository<KpiTemplateCycle, Integer> {

    List<KpiTemplateCycle> findAllByOrderByCreatedAtDesc();

    List<KpiTemplateCycle> findByStatus(KpiTemplateCycleStatus status);

    List<KpiTemplateCycle> findByStatusOrderByEarlyCloseRequestedAtAsc(KpiTemplateCycleStatus status);
}
