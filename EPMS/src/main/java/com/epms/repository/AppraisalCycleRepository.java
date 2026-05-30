package com.epms.repository;

import com.epms.entity.AppraisalCycle;
import com.epms.entity.enums.AppraisalCycleStatus;
import com.epms.entity.enums.AppraisalCycleType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AppraisalCycleRepository extends JpaRepository<AppraisalCycle, Integer> {

    boolean existsByCycleTypeAndCycleYearAndPeriodNo(AppraisalCycleType cycleType, Integer cycleYear, Integer periodNo);

    boolean existsByCycleNameIgnoreCase(String cycleName);

    boolean existsByCycleNameIgnoreCaseAndIdNot(String cycleName, Integer id);

    boolean existsByStartDateAndEndDate(LocalDate startDate, LocalDate endDate);

    boolean existsByStartDateAndEndDateAndIdNot(LocalDate startDate, LocalDate endDate, Integer id);

    Optional<AppraisalCycle> findByCycleTypeAndCycleYearAndPeriodNo(AppraisalCycleType cycleType, Integer cycleYear, Integer periodNo);

    List<AppraisalCycle> findByStatus(AppraisalCycleStatus status);

    List<AppraisalCycle> findByCycleYearOrderByStartDateAsc(Integer cycleYear);

    @EntityGraph(attributePaths = {"template"})
    List<AppraisalCycle> findByStatusOrderByStartDateDesc(AppraisalCycleStatus status);

    @Query("""
        SELECT c
        FROM AppraisalCycle c
        WHERE c.status = :status
          AND (c.locked IS NULL OR c.locked = false)
          AND c.endDate <= :today
        """)
    List<AppraisalCycle> findExpiredUnlockedCycles(
            @Param("status") AppraisalCycleStatus status,
            @Param("today") LocalDate today
    );

    @Query("""
        SELECT DISTINCT c
        FROM AppraisalCycle c
        LEFT JOIN FETCH c.template
        LEFT JOIN FETCH c.cycleDepartments cd
        LEFT JOIN FETCH cd.department
        WHERE c.id = :cycleId
        """)
    Optional<AppraisalCycle> findByIdWithTemplateAndDepartments(@Param("cycleId") Integer cycleId);
}
