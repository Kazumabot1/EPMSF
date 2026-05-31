package com.epms.service;

import com.epms.entity.User;
import com.epms.entity.enums.FeedbackRelationshipType;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Central 360 feedback relationship resolver.
 *
 * This service intentionally does NOT use users.manager_id / employee.manager_id.
 * Manager, subordinate, and peer candidates are resolved only from current reviewer eligibility:
 * active teams, team leaders, active department managers, and department heads.
 */
public interface FeedbackWorkRelationshipResolver {

    List<User> resolveManagerUsers(User targetUser);

    LinkedHashSet<Long> resolveManagerEmployeeIds(User targetUser);

    LinkedHashSet<Long> resolveSubordinateEmployeeIds(User targetUser);

    LinkedHashSet<Long> resolvePeerEmployeeIds(User targetUser);

    LinkedHashSet<Integer> resolveActiveTeamIds(User user);

    boolean isValidRelationship(User targetUser, User evaluatorUser, FeedbackRelationshipType relationshipType);

    boolean isWorkContextManager(User targetUser, User evaluatorUser);

    boolean isWorkContextSubordinate(User targetUser, User evaluatorUser);

    boolean isWorkContextPeer(User targetUser, User evaluatorUser);

    boolean sharesActiveTeam(User left, User right);

    boolean sameDepartment(User left, User right);

    boolean isHrAdminOrExecutive(User user);

    Set<String> normalizedRoleNames(User user);
}
