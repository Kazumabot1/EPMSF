/*
package com.epms.repository;

import com.epms.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Integer> {
    List<AuditLog> findTop200ByOrderByTimestampDesc();
    List<AuditLog> findTop200ByEntityTypeOrderByTimestampDesc(String entityType);
    List<AuditLog> findTop200ByEntityTypeAndEntityIdOrderByTimestampDesc(String entityType, Integer entityId);
}
*/


/*

package com.epms.repository;

import com.epms.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Integer> {
    List<AuditLog> findTop200ByOrderByTimestampDesc();
    List<AuditLog> findTop200ByEntityTypeOrderByTimestampDesc(String entityType);
    List<AuditLog> findTop200ByEntityTypeInOrderByTimestampDesc(Collection<String> entityTypes);
    List<AuditLog> findTop200ByEntityTypeAndEntityIdOrderByTimestampDesc(String entityType, Integer entityId);
}*/



package com.epms.repository;

import com.epms.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Integer> {

    List<AuditLog> findByOrderByTimestampDesc();

    List<AuditLog> findByEntityTypeOrderByTimestampDesc(String entityType);

    List<AuditLog> findByEntityTypeAndEntityIdOrderByTimestampDesc(String entityType, Integer entityId);

    List<AuditLog> findByEntityTypeInOrderByTimestampDesc(Collection<String> entityTypes);

    List<AuditLog> findByUserIdOrderByTimestampDesc(Integer userId);

    List<AuditLog> findByEntityTypeAndUserIdOrderByTimestampDesc(String entityType, Integer userId);

    List<AuditLog> findByEntityTypeAndEntityIdAndUserIdOrderByTimestampDesc(
            String entityType,
            Integer entityId,
            Integer userId
    );

    List<AuditLog> findByEntityTypeInAndUserIdOrderByTimestampDesc(
            Collection<String> entityTypes,
            Integer userId
    );

    @Query("""
            SELECT DISTINCT a.userId
            FROM AuditLog a
            WHERE a.userId IS NOT NULL
              AND a.entityType IN :entityTypes
            ORDER BY a.userId
            """)
    List<Integer> findDistinctUserIdsByEntityTypeIn(@Param("entityTypes") Collection<String> entityTypes);
}
