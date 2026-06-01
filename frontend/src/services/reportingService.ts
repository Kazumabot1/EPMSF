import api from './api';

export type ReportingSummary = {
  totalEmployees: number;
  activeEmployees: number;
  totalAssessments: number;
  submittedAssessments: number;
  approvedAssessments: number;
  pendingAssessments: number;
  activePips: number;
  completedPips: number;
  feedbackCampaigns: number;
  activeFeedbackCampaigns: number;
  averageAssessmentScore: number;
  totalKpiRecords: number;
  finalizedKpiRecords: number;
  averageKpiScore: number;
  highKpiPerformers: number;
  lowKpiPerformers: number;
  overallPerformanceScore: number;
  feedbackCompletionRate: number;
  highPerformers: number;
  lowPerformers: number;
};

export type ReportingAccess = {
  userId?: number;
  role?: string;
  departmentId?: number | null;
  scopeLabel?: string | null;
  canViewAllDepartments?: boolean;
  canExport?: boolean;
};

export type DepartmentPerformanceRow = {
  departmentId?: number | null;
  departmentName?: string | null;
  employeeCount: number;
  assessmentCount: number;
  approvedCount: number;
  pendingCount: number;
  activePipCount: number;
  kpiRecordCount: number;
  averageScore: number;
  averageKpiScore: number;
  overallScore: number;
  performanceLabel?: string | null;
};

export type EmployeePerformanceRow = {
  assessmentId?: number | null;
  employeeId?: number | null;
  userId?: number | null;
  employeeName?: string | null;
  employeeCode?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  position?: string | null;
  managerName?: string | null;
  formName?: string | null;
  period?: string | null;
  status?: string | null;
  totalScore: number;
  maxScore: number;
  scorePercent: number;
  performanceLabel?: string | null;
  assessmentDate?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
};


export type KpiPerformanceRow = {
  employeeKpiFormId?: number | null;
  employeeId?: number | null;
  employeeName?: string | null;
  employeeCode?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  position?: string | null;
  kpiTitle?: string | null;
  status?: string | null;
  totalScore: number;
  totalWeightedScore: number;
  performanceLabel?: string | null;
  periodStartDate?: string | null;
  periodEndDate?: string | null;
  finalizedAt?: string | null;
};

export type StatusBreakdownRow = {
  status: string;
  count: number;
  percentage: number;
};

export type PipReportRow = {
  pipId?: number | null;
  employeeUserId?: number | null;
  employeeName?: string | null;
  employeeCode?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  goal?: string | null;
  active: boolean;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string | null;
  finishedAt?: string | null;
  createdByName?: string | null;
};

export type FeedbackParticipationRow = {
  campaignId?: number | null;
  campaignName?: string | null;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  assignedCount: number;
  submittedCount: number;
  pendingCount: number;
  completionRate: number;
};

export type RecommendationRow = {
  employeeId?: number | null;
  userId?: number | null;
  employeeName?: string | null;
  employeeCode?: string | null;
  departmentName?: string | null;
  recommendationType?: string | null;
  scorePercent: number;
  performanceLabel?: string | null;
  reason?: string | null;
};

export type ReportingDashboard = {
  access: ReportingAccess;
  summary: ReportingSummary;
  departmentPerformance: DepartmentPerformanceRow[];
  employeePerformance: EmployeePerformanceRow[];
  assessmentStatusBreakdown: StatusBreakdownRow[];
  pipStatusReport: PipReportRow[];
  feedbackParticipation: FeedbackParticipationRow[];
  promotionRecommendations: RecommendationRow[];
  kpiPerformance: KpiPerformanceRow[];
};

const emptySummary: ReportingSummary = {
  totalEmployees: 0,
  activeEmployees: 0,
  totalAssessments: 0,
  submittedAssessments: 0,
  approvedAssessments: 0,
  pendingAssessments: 0,
  activePips: 0,
  completedPips: 0,
  feedbackCampaigns: 0,
  activeFeedbackCampaigns: 0,
  averageAssessmentScore: 0,
  totalKpiRecords: 0,
  finalizedKpiRecords: 0,
  averageKpiScore: 0,
  highKpiPerformers: 0,
  lowKpiPerformers: 0,
  overallPerformanceScore: 0,
  feedbackCompletionRate: 0,
  highPerformers: 0,
  lowPerformers: 0,
};

export const emptyReportingDashboard: ReportingDashboard = {
  access: {},
  summary: emptySummary,
  departmentPerformance: [],
  employeePerformance: [],
  assessmentStatusBreakdown: [],
  pipStatusReport: [],
  feedbackParticipation: [],
  promotionRecommendations: [],
  kpiPerformance: [],
};

const unwrap = <T,>(response: any, fallback: T): T => {
  return response?.data?.data ?? response?.data ?? fallback;
};

const numberValue = (value: any) => {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
};

const normalizeDashboard = (raw: any): ReportingDashboard => {
  return {
    access: raw?.access ?? {},
    summary: {
      totalEmployees: numberValue(raw?.summary?.totalEmployees),
      activeEmployees: numberValue(raw?.summary?.activeEmployees),
      totalAssessments: numberValue(raw?.summary?.totalAssessments),
      submittedAssessments: numberValue(raw?.summary?.submittedAssessments),
      approvedAssessments: numberValue(raw?.summary?.approvedAssessments),
      pendingAssessments: numberValue(raw?.summary?.pendingAssessments),
      activePips: numberValue(raw?.summary?.activePips),
      completedPips: numberValue(raw?.summary?.completedPips),
      feedbackCampaigns: numberValue(raw?.summary?.feedbackCampaigns),
      activeFeedbackCampaigns: numberValue(raw?.summary?.activeFeedbackCampaigns),
      averageAssessmentScore: numberValue(raw?.summary?.averageAssessmentScore),
      totalKpiRecords: numberValue(raw?.summary?.totalKpiRecords),
      finalizedKpiRecords: numberValue(raw?.summary?.finalizedKpiRecords),
      averageKpiScore: numberValue(raw?.summary?.averageKpiScore),
      highKpiPerformers: numberValue(raw?.summary?.highKpiPerformers),
      lowKpiPerformers: numberValue(raw?.summary?.lowKpiPerformers),
      overallPerformanceScore: numberValue(raw?.summary?.overallPerformanceScore),
      feedbackCompletionRate: numberValue(raw?.summary?.feedbackCompletionRate),
      highPerformers: numberValue(raw?.summary?.highPerformers),
      lowPerformers: numberValue(raw?.summary?.lowPerformers),
    },
    departmentPerformance: Array.isArray(raw?.departmentPerformance) ? raw.departmentPerformance : [],
    employeePerformance: Array.isArray(raw?.employeePerformance) ? raw.employeePerformance : [],
    assessmentStatusBreakdown: Array.isArray(raw?.assessmentStatusBreakdown)
      ? raw.assessmentStatusBreakdown
      : [],
    pipStatusReport: Array.isArray(raw?.pipStatusReport) ? raw.pipStatusReport : [],
    feedbackParticipation: Array.isArray(raw?.feedbackParticipation)
      ? raw.feedbackParticipation
      : [],
    promotionRecommendations: Array.isArray(raw?.promotionRecommendations)
      ? raw.promotionRecommendations
      : [],
    kpiPerformance: Array.isArray(raw?.kpiPerformance) ? raw.kpiPerformance : [],
  };
};

let dashboardInFlight: Promise<ReportingDashboard> | null = null;
let dashboardCache: { data: ReportingDashboard; loadedAt: number } | null = null;
const DASHBOARD_CACHE_MS = 5000;

export const reportingService = {
  async getDashboard(forceRefresh = false): Promise<ReportingDashboard> {
    const now = Date.now();

    if (!forceRefresh && dashboardCache && now - dashboardCache.loadedAt < DASHBOARD_CACHE_MS) {
      return dashboardCache.data;
    }

    if (!forceRefresh && dashboardInFlight) {
      return dashboardInFlight;
    }

    dashboardInFlight = api
      .get('/reports/dashboard')
      .then((response) => {
        const data = normalizeDashboard(unwrap<any>(response, emptyReportingDashboard));
        dashboardCache = { data, loadedAt: Date.now() };
        return data;
      })
      .finally(() => {
        dashboardInFlight = null;
      });

    return dashboardInFlight;
  },
};
