package com.epms.repository;

import com.epms.entity.KpiTemplateCyclePeriod;
import com.epms.entity.enums.KpiTemplateCyclePeriodStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface KpiTemplateCyclePeriodRepository extends JpaRepository<KpiTemplateCyclePeriod, Integer> {

    Optional<KpiTemplateCyclePeriod> findTopByCycle_IdOrderByPeriodNumberDesc(Integer cycleId);

    Optional<KpiTemplateCyclePeriod> findTopByCycle_IdAndKpiForm_IdOrderByPeriodNumberDesc(
            Integer cycleId,
            Integer kpiFormId
    );

    List<KpiTemplateCyclePeriod> findByCycle_IdAndKpiForm_IdOrderByPeriodNumberAsc(Integer cycleId, Integer kpiFormId);

    Optional<KpiTemplateCyclePeriod> findByCycle_IdAndKpiForm_IdAndPeriodNumber(Integer cycleId, Integer kpiFormId, Integer periodNumber);

    Optional<KpiTemplateCyclePeriod> findTopByCycle_IdAndStatusInOrderByPeriodNumberDesc(
            Integer cycleId,
            Collection<KpiTemplateCyclePeriodStatus> statuses
    );

    Optional<KpiTemplateCyclePeriod> findTopByCycle_IdAndKpiForm_IdAndStatusInOrderByPeriodNumberDesc(
            Integer cycleId,
            Integer kpiFormId,
            Collection<KpiTemplateCyclePeriodStatus> statuses
    );

    List<KpiTemplateCyclePeriod> findByCycle_IdOrderByPeriodNumberAsc(Integer cycleId);

    List<KpiTemplateCyclePeriod> findByCycle_IdAndStatusIn(
            Integer cycleId,
            Collection<KpiTemplateCyclePeriodStatus> statuses
    );

    @Query(
            """
                    SELECT p FROM KpiTemplateCyclePeriod p
                    JOIN FETCH p.kpiForm f
                    WHERE p.cycle.id = :cycleId
                    ORDER BY f.id ASC, p.periodNumber ASC
                    """
    )
    List<KpiTemplateCyclePeriod> findAllWithFormByCycleIdOrderByFormIdAndPeriodNumber(@Param("cycleId") Integer cycleId);

    @Query(
            """
                    SELECT p FROM KpiTemplateCyclePeriod p
                    JOIN FETCH p.cycle c
                    WHERE p.status = :status
                    AND p.endDate < :today
                    """
    )
    List<KpiTemplateCyclePeriod> findOpenPeriodsPastEnd(
            @Param("status") KpiTemplateCyclePeriodStatus status,
            @Param("today") LocalDate today
    );

    @Query(
            """
                    SELECT p FROM KpiTemplateCyclePeriod p
                    JOIN FETCH p.cycle c
                    WHERE p.status = :status
                    AND p.graceEndsAt IS NOT NULL
                    AND p.graceEndsAt <= :now
                    """
    )
    List<KpiTemplateCyclePeriod> findClosingPeriodsDue(
            @Param("status") KpiTemplateCyclePeriodStatus status,
            @Param("now") LocalDateTime now
    );
}
