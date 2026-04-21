package com.epms.repository;

import com.epms.entity.RatingScale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RatingScaleRepository extends JpaRepository<RatingScale, Integer> {
}
