package com.epms.repository;

import com.epms.entity.Position;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PositionRepository extends JpaRepository<Position, Integer> {

    List<Position> findByStatus(Boolean status);

    boolean existsByPositionTitle(String positionTitle);
}
