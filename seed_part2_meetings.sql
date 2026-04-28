-- ================================================================
-- EPMS TEST DATA - PART 2: 1:1 Meetings & Action Items
-- Run AFTER seed_part1_foundation.sql
-- manager_id = 2 (Aye Aye Win, HR Manager) for most meetings
-- ================================================================
SET FOREIGN_KEY_CHECKS = 0;

-- ================================================================
-- ONE-ON-ONE MEETINGS
-- Status: 0=upcoming, 1=ongoing/past
-- is_finalized: NULL=not done, datetime=finished
-- ================================================================
INSERT IGNORE INTO one_on_one_meetings
    (id, employee_id, manager_id, scheduled_date, notes, status, follow_up_date, is_finalized, created_at, parent_meeting_id)
VALUES
-- ── PAST MEETINGS (is_finalized set) ───────────────────────────
(1, 4, 2, '2026-01-20 09:00:00',
 'Q1 performance check – IT department. Discuss deliverables.',
 b'1', NULL, '2026-01-20 09:55:00', '2026-01-15 08:00:00', NULL),

(2, 5, 2, '2026-02-05 10:00:00',
 'Code review process improvement discussion.',
 b'1', NULL, '2026-02-05 10:50:00', '2026-01-30 09:00:00', NULL),

(3, 8, 2, '2026-02-14 14:00:00',
 'Finance team Q4 close-out review and KPI alignment.',
 b'1', NULL, '2026-02-14 15:00:00', '2026-02-10 10:00:00', NULL),

(4, 11, 2, '2026-02-28 11:00:00',
 'Marketing Q1 campaign results and Q2 planning.',
 b'1', NULL, '2026-02-28 11:55:00', '2026-02-22 09:00:00', NULL),

(5, 14, 2, '2026-03-10 09:30:00',
 'Operations efficiency report – monthly check-in.',
 b'1', NULL, '2026-03-10 10:20:00', '2026-03-05 08:30:00', NULL),

(6, 18, 2, '2026-03-20 15:00:00',
 'Banking department onboarding follow-up – Shwe Sin.',
 b'1', NULL, '2026-03-20 15:45:00', '2026-03-15 09:00:00', NULL),

(7, 17, 2, '2026-04-01 10:00:00',
 'Legal compliance quarterly review and contract audit status.',
 b'1', NULL, '2026-04-01 10:55:00', '2026-03-25 11:00:00', NULL),

(8, 9, 3, '2026-04-05 14:00:00',
 'Thida Oo mid-year performance review – Finance.',
 b'1', NULL, '2026-04-05 14:50:00', '2026-03-28 10:00:00', NULL),

(9, 12, 3, '2026-04-10 09:00:00',
 'Sales targets discussion – Zin Mar Q1 actuals vs targets.',
 b'1', NULL, '2026-04-10 09:55:00', '2026-04-04 08:00:00', NULL),

(10, 19, 2, '2026-04-15 11:00:00',
 'Banking team performance and client satisfaction.',
 b'1', NULL, '2026-04-15 12:00:00', '2026-04-08 09:00:00', NULL),

-- ── ONGOING MEETINGS (status=1, is_finalized=NULL) ─────────────
(11, 6,  2, '2026-04-27 06:00:00',
 'Su Su Hlaing – IT mid-sprint check-in and blockers review.',
 b'1', NULL, NULL, '2026-04-20 08:00:00', NULL),

(12, 10, 2, '2026-04-27 06:30:00',
 'Win Kyaw – Finance month-end closing support.',
 b'1', NULL, NULL, '2026-04-20 08:30:00', NULL),

(13, 13, 3, '2026-04-27 07:00:00',
 'Khin Myat – New sales territory assignment discussion.',
 b'1', NULL, NULL, '2026-04-21 09:00:00', NULL),

(14, 20, 2, '2026-04-27 07:15:00',
 'Phyu Phyu – Banking customer complaint resolution process.',
 b'1', NULL, NULL, '2026-04-22 10:00:00', NULL),

-- ── UPCOMING MEETINGS (status=0, is_finalized=NULL) ────────────
(15, 7,  2, '2026-04-30 10:00:00',
 'Phyo Wai – IT support SLA performance review.',
 b'0', NULL, NULL, '2026-04-25 09:00:00', NULL),

(16, 10, 3, '2026-05-02 14:00:00',
 'Win Kyaw – Q2 budget planning alignment.',
 b'0', NULL, NULL, '2026-04-25 10:00:00', NULL),

(17, 15, 2, '2026-05-07 09:00:00',
 'Ye Naing – Project timeline review for Q2 deliverables.',
 b'0', NULL, NULL, '2026-04-26 08:00:00', NULL),

(18, 16, 2, '2026-05-12 11:00:00',
 'Hla Hla – Business analyst career development plan.',
 b'0', NULL, NULL, '2026-04-26 09:00:00', NULL),

(19, 21, 3, '2026-05-20 10:00:00',
 'Lin Lin – Customer service team expansion discussion.',
 b'0', NULL, NULL, '2026-04-26 10:00:00', NULL),

(20, 17, 2, '2026-06-05 14:00:00',
 'Tin Maung – H2 legal strategy and regulatory updates.',
 b'0', NULL, NULL, '2026-04-27 07:00:00', NULL),

-- ── FOLLOW-UP MEETINGS (parent_meeting_id set) ──────────────────
-- Follow-up to meeting #1 (Zaw Lin, IT) – original had issues
(21, 4, 2, '2026-05-03 09:00:00',
 'Follow-up: Zaw Lin action items from Q1 check. Previous blockers resolved?',
 b'0', NULL, NULL, '2026-01-20 10:00:00', 1),

-- Follow-up to meeting #3 (Myat Noe, Finance)
(22, 8, 2, '2026-04-30 14:00:00',
 'Follow-up: Finance KPI targets progress check after Feb meeting.',
 b'0', NULL, NULL, '2026-02-14 15:30:00', 3),

-- Follow-up to meeting #7 (Tin Maung, Legal)
(23, 17, 2, '2026-05-15 10:00:00',
 'Follow-up: Legal audit action items completion check.',
 b'0', NULL, NULL, '2026-04-01 11:00:00', 7),

-- Follow-up to meeting #9 (Zin Mar, Marketing) – Sales targets
(24, 12, 3, '2026-05-08 09:30:00',
 'Follow-up: Sales pipeline progress since April meeting.',
 b'0', NULL, NULL, '2026-04-10 10:00:00', 9);

-- ================================================================
-- ONE-ON-ONE ACTION ITEMS
-- Only for meetings that have started (ongoing + past)
-- ================================================================
INSERT IGNORE INTO one_on_one_action_items (id, meeting_id, description, updated_at) VALUES
(1,1,'Zaw Lin agreed to complete the code documentation by Jan 31. Will submit weekly progress updates. Manager to review architecture decisions in next sprint.','2026-01-20 09:55:00'),
(2,2,'Nay Min Oo to implement unit testing framework. Target: 80% code coverage by end of Q1. Pair programming sessions scheduled with Zaw Lin twice weekly.','2026-02-05 10:50:00'),
(3,3,'Myat Noe to finalize Q4 close-out report by Feb 20. Flagged reconciliation discrepancy in accounts — to be reviewed with CFO. Action: submit findings by EOW.','2026-02-14 15:00:00'),
(4,4,'May Thu committed to presenting Q2 digital campaign plan by March 7. Social media budget reallocation approved pending finance sign-off. Follow up on agency contracts.','2026-02-28 11:55:00'),
(5,5,'Aung Ko to review operations SLA metrics. 3 underperforming KPIs identified — improvement plan to be submitted by March 20. Weekly team stand-ups re-introduced.','2026-03-10 10:20:00'),
(6,6,'Shwe Sin onboarding completed. Banking system access granted. Assigned to Moe Kyaw as buddy. 30-day review scheduled. Complete compliance training by April 1.','2026-03-20 15:45:00'),
(7,7,'Tin Maung submitted contract audit report. 12 contracts flagged for renewal. Action: prioritize top 5 by April 15. External legal review requested for 2 complex cases.','2026-04-01 10:55:00'),
(8,8,'Thida Oo performance on track. Identified need for advanced Excel training — enrolled in internal training program. Goal: complete financial modeling module by May 1.','2026-04-05 14:50:00'),
(9,9,'Zin Mar achieved 85% of Q1 sales target. New territory assigned — Mandalay region. Sales script and pitch deck to be updated by April 20. Mentor assigned: May Thu.','2026-04-10 09:55:00'),
(10,10,'Moe Kyaw addressed 15 customer complaints in Q1. Response time improved by 30%. New escalation process introduced. Follow up on pending cases #234, #251.','2026-04-15 12:00:00'),
-- Ongoing meetings — descriptions being drafted now
(11,11,'Su Su Hlaing raised concerns about sprint velocity. Agreed to reassign 2 tickets to Nay Min. Blocker: API integration with payment gateway — DevOps team to assist.','2026-04-27 07:30:00'),
(12,12,'Win Kyaw month-end closing on schedule. Two vendor invoices pending approval — escalated to Finance Manager. Tax filing deadline: April 30. No blockers identified.','2026-04-27 07:45:00'),
(13,13,'Khin Myat assigned Bago and Sagaing regions. Introductory calls with 8 new leads this week. Training on CRM system scheduled April 29. Q2 target: 15 new accounts.','2026-04-27 08:00:00'),
(14,14,'Phyu Phyu handling 3 escalated complaints. Root cause: loan processing delay. Proposed solution: new fast-track approval process. Pilot with 10 cases next week.','2026-04-27 08:15:00'),
-- Action item for a past follow-up meeting would go here if finalized
(15,1,'[Supplemental] Zaw Lin architecture review completed. All code review comments addressed. Performance benchmark results shared with team lead.','2026-01-25 11:00:00');

SET FOREIGN_KEY_CHECKS = 1;
SELECT 'Part 2 seed complete. Total: 24 meetings, 15 action items.' AS status;
