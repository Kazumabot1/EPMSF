package com.epms.schedule;

import com.epms.service.EmployeeKpiWorkflowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class KpiAutoFinalizeScheduler {

    private final EmployeeKpiWorkflowService employeeKpiWorkflowService;

    /** Daily at 01:30 server time — backup pass if no one opened HR / employee KPI views. */
    @Scheduled(cron = "0 30 1 * * ?")
    public void autoFinalizePastDue() {
        try {
            int n = employeeKpiWorkflowService.runAutoFinalizePastDueAssignments();
            int maintenance = employeeKpiWorkflowService.runCycleMaintenance();
            if (n > 0) {
                log.info("KPI auto-finalize: {} assignment(s) finalized after period end.", n);
            }
            if (maintenance > 0) {
                log.info("KPI cycle maintenance: {} cycle/transition item(s) processed.", maintenance);
            }
        } catch (Exception ex) {
            log.warn("KPI auto-finalize job failed: {}", ex.getMessage());
        }
    }
}
