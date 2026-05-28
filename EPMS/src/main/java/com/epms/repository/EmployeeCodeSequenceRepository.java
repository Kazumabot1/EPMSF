package com.epms.repository;

import com.epms.entity.EmployeeCodeSequence;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface EmployeeCodeSequenceRepository extends JpaRepository<EmployeeCodeSequence, Long> {

    Optional<EmployeeCodeSequence> findByPrefix(String prefix);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT sequence FROM EmployeeCodeSequence sequence WHERE sequence.prefix = :prefix")
    Optional<EmployeeCodeSequence> findByPrefixForUpdate(@Param("prefix") String prefix);
}
