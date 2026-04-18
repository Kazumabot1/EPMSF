package com.epms.repository;

import com.epms.entity.PositionLevel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PositionLevelRepository extends JpaRepository<PositionLevel, Integer> {

    boolean existsByLevelCode(String levelCode);

    Optional<PositionLevel> findByLevelCode(String levelCode);
}
