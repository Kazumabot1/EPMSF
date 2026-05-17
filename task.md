# Self-Assessment Flow — Task Tracker

## Backend
- [/] Add `getMyHistory()` to `EmployeeAssessmentService` + `EmployeeAssessmentRepository`
- [/] Fix backend view bug (closed-form-period blocks viewing submitted assessments)
- [/] Add `/api/employee-assessments/my-history` endpoint to `EmployeeAssessmentController`

## Frontend — Service Layer
- [ ] Add `getMyHistory()` to `employeeAssessmentService.ts`
- [ ] Fix `getLatestDraft()` edge case (closed period + submitted record)

## Frontend — Main Self-Assessment Page
- [ ] Rewrite `EmployeeSelfAssessmentPage.tsx` (complete overhaul)
- [ ] Create new `employee-self-assessment.css` (premium design)

## Frontend — History Page
- [ ] Convert `EmployeeAssessmentScoresPage.tsx` into `EmployeeAssessmentHistoryPage.tsx`
- [ ] Update App.tsx to route `/employee/assessment-scores` to history page
