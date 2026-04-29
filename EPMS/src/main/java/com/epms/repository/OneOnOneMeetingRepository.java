//package com.epms.repository;
//
//import com.epms.entity.OneOnOneMeeting;
//import org.springframework.data.jpa.repository.JpaRepository;
//import org.springframework.data.jpa.repository.Query;
//import org.springframework.data.repository.query.Param;
//import org.springframework.stereotype.Repository;
//
//import java.time.LocalDateTime;
//import java.util.List;
//
//@Repository
//public interface OneOnOneMeetingRepository extends JpaRepository<OneOnOneMeeting, Integer> {
//
//    // --- Scheduler: find meetings whose time has arrived but status is still false ---
//    @Query("SELECT m FROM OneOnOneMeeting m WHERE m.scheduledDate <= :now AND m.status = false AND m.isFinalized IS NULL")
//    List<OneOnOneMeeting> findMeetingsToActivate(@Param("now") LocalDateTime now);
//
//    // --- Upcoming: not yet started, not finalized, scheduled in the future ---
//    @Query("SELECT m FROM OneOnOneMeeting m WHERE m.status = false AND m.isFinalized IS NULL AND m.scheduledDate > :now ORDER BY m.scheduledDate ASC")
//    List<OneOnOneMeeting> findUpcoming(@Param("now") LocalDateTime now);
//
//    // --- Ongoing: status=true, not yet finalized ---
//    @Query("SELECT m FROM OneOnOneMeeting m WHERE m.status = true AND m.isFinalized IS NULL ORDER BY m.scheduledDate ASC")
//    List<OneOnOneMeeting> findOngoing();
//
//    // --- Past: finalized ---
//    @Query("SELECT m FROM OneOnOneMeeting m WHERE m.isFinalized IS NOT NULL ORDER BY m.isFinalized DESC")
//    List<OneOnOneMeeting> findPast();
//
//    // added by KHN ( ChatGPT)
//    @Query("""
//SELECT m FROM OneOnOneMeeting m
//WHERE m.employee.id = :employeeId
//AND m.isFinalized IS NULL
//""")
//    List<OneOnOneMeeting> findActiveMeetingsByEmployee(@Param("employeeId") Integer employeeId);
//}
//

package com.epms.repository;

import com.epms.entity.OneOnOneMeeting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface OneOnOneMeetingRepository extends JpaRepository<OneOnOneMeeting, Integer> {

    @Query("SELECT m FROM OneOnOneMeeting m WHERE m.scheduledDate <= :now AND m.status = false AND m.isFinalized IS NULL")
    List<OneOnOneMeeting> findMeetingsToActivate(@Param("now") LocalDateTime now);

    @Query("SELECT m FROM OneOnOneMeeting m WHERE m.status = false AND m.isFinalized IS NULL AND m.scheduledDate > :now ORDER BY m.scheduledDate ASC")
    List<OneOnOneMeeting> findUpcoming(@Param("now") LocalDateTime now);

    @Query("SELECT m FROM OneOnOneMeeting m WHERE m.status = true AND m.isFinalized IS NULL ORDER BY m.scheduledDate ASC")
    List<OneOnOneMeeting> findOngoing();

    @Query("SELECT m FROM OneOnOneMeeting m WHERE m.isFinalized IS NOT NULL ORDER BY m.isFinalized DESC")
    List<OneOnOneMeeting> findPast();

    @Query("""
        SELECT m FROM OneOnOneMeeting m
        WHERE m.employee.id = :employeeId
        AND m.status = false
        AND m.isFinalized IS NULL
        AND m.scheduledDate > :now
        ORDER BY m.scheduledDate ASC
    """)
    List<OneOnOneMeeting> findUpcomingByEmployee(
            @Param("employeeId") Integer employeeId,
            @Param("now") LocalDateTime now
    );

    @Query("""
SELECT m FROM OneOnOneMeeting m
WHERE (m.manager.id = :employeeId OR m.employee.id = :employeeId)
AND m.status = false
AND m.isFinalized IS NULL
AND m.scheduledDate > :now
ORDER BY m.scheduledDate ASC
""")
    List<OneOnOneMeeting> findUpcomingForUser(Integer employeeId, LocalDateTime now);


    @Query("""
SELECT m FROM OneOnOneMeeting m
WHERE (m.manager.id = :employeeId OR m.employee.id = :employeeId)
AND m.status = true
AND m.isFinalized IS NULL
""")
    List<OneOnOneMeeting> findOngoingForUser(Integer employeeId);


    @Query("""
SELECT m FROM OneOnOneMeeting m
WHERE (m.manager.id = :employeeId OR m.employee.id = :employeeId)
AND m.isFinalized IS NOT NULL
""")
    List<OneOnOneMeeting> findPastForUser(Integer employeeId);


    @Query("""
SELECT m FROM OneOnOneMeeting m
WHERE m.status = false
AND m.isFinalized IS NULL
AND m.reminder24hSent = false
AND m.scheduledDate BETWEEN :now AND :limit
""")
    List<OneOnOneMeeting> findMeetingsForReminder(LocalDateTime now, LocalDateTime limit);
}