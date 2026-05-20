import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchDepartments } from '../../services/departmentService';
import type { Department } from '../../services/departmentService';
import { appraisalAuditService, appraisalCycleService, appraisalTemplateService, type AppraisalAuditLog } from '../../services/appraisalService';
import { signatureService } from '../../services/signatureService';
import { extractApiErrorMessage } from '../../services/apiError';
import type {
  AppraisalCriterionRequest,
  AppraisalCycleRequest,
  AppraisalCycleResponse,
  AppraisalCycleType,
  AppraisalScoreBandRequest,
  AppraisalSectionRequest,
  AppraisalTemplateRequest,
  AppraisalTemplateResponse,
} from '../../types/appraisal';
import type { Signature } from '../../types/signature';
import AppraisalRatingDots from '../../components/appraisal/AppraisalRatingDots';
import './appraisal.css';

const currentYear = new Date().getFullYear();
const cycleYearOptions = Array.from({ length: 12 }, (_, index) => currentYear + index);

type DateTextState = {
  startDate: string;
  endDate: string;
  submissionDeadline: string;
  managerSubmissionDeadline: string;
  deptHeadSubmissionDeadline: string;
};

type SignatureDisplayBlockProps = {
  label: string;
  signature?: Signature;
  dateText: string;
};

type ScoreBandLike = {
  minScore: number;
  maxScore: number;
  label: string;
  description?: string;
  sortOrder: number;
  active: boolean;
};

type PopupState = {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  onOk?: () => void | Promise<void>;
  onConfirm?: () => void | Promise<void>;
};

const defaultScoreBands = (): AppraisalScoreBandRequest[] => [
  { minScore: 86, maxScore: 100, label: 'Outstanding', description: 'Performance exceptional and far exceeds expectations.', sortOrder: 1, active: true },
  { minScore: 71, maxScore: 85, label: 'Exceeds Requirements', description: 'Performance is consistent and clearly meets essential requirements.', sortOrder: 2, active: true },
  { minScore: 60, maxScore: 70, label: 'Meet Requirement', description: 'Performance is satisfactory and meets requirements of the job.', sortOrder: 3, active: true },
  { minScore: 40, maxScore: 59, label: 'Need Improvement', description: 'Performance is inconsistent. Supervision and training are needed.', sortOrder: 4, active: true },
  { minScore: 0, maxScore: 39, label: 'Unsatisfactory', description: 'Performance does not meet the minimum requirement of the job.', sortOrder: 5, active: true },
];

const uniqueScoreBands = <T extends ScoreBandLike>(bands: T[]) => {
  const unique = new Map<string, T>();
  for (const band of bands) {
    const key = `${band.minScore}-${band.maxScore}-${band.label.trim().toLowerCase()}`;
    if (!unique.has(key)) unique.set(key, band);
  }
  return Array.from(unique.values()).sort((a, b) => a.sortOrder - b.sortOrder);
};

const clampScore = (value: number) => Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

const displayDate = (value?: string | null) => {
  if (!value) return '-';
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
};

const displayDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const formatDateByPattern = (date: Date, pattern: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD') => {
  const day = `${date.getDate()}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const year = `${date.getFullYear()}`;
  if (pattern === 'MM/DD/YYYY') return `${month}/${day}/${year}`;
  if (pattern === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
  return `${day}/${month}/${year}`;
};

const getSignatureImageSrc = (signature?: Signature) => {
  if (!signature) return null;
  return signature.imageData.startsWith('data:')
    ? signature.imageData
    : `data:${signature.imageType};base64,${signature.imageData}`;
};

const formatIsoDateFromLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const SignatureDisplayBlock = ({ label, signature, dateText }: SignatureDisplayBlockProps) => {
  const src = getSignatureImageSrc(signature);
  return (
    <div className="appraisal-signature-slot">
      {src ? (
        <img src={src} alt={signature?.name ?? 'signature'} className="appraisal-signature-image" />
      ) : (
        <span className="appraisal-signature-placeholder">{label}</span>
      )}
      <p className="appraisal-signature-date">Date: {dateText}</p>
      {signature ? <small className="appraisal-signature-name">{signature.name}</small> : null}
    </div>
  );
};

const parseDisplayDate = (value: string) => {
  const trimmed = value.trim();
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (!match) return null;
  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.getFullYear() !== Number(year) || parsed.getMonth() + 1 !== Number(month) || parsed.getDate() !== Number(day)) return null;
  return iso;
};

const addMonthsMinusOneDay = (value: string) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  date.setMonth(date.getMonth() + 6);
  date.setDate(date.getDate() - 1);
  return formatIsoDateFromLocal(date);
};

const addOneYear = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setFullYear(date.getFullYear() + 1);
  return formatIsoDateFromLocal(date);
};

const statusClass = (status: string) => {
  if (status === 'ACTIVE') return 'green';
  if (status === 'LOCKED') return 'amber';
  if (status === 'COMPLETED') return 'gray';
  return '';
};

const canCompleteCycle = (cycle: AppraisalCycleResponse) => Boolean(cycle.locked) || cycle.status === 'LOCKED';

const formatCycleType = (value: AppraisalCycleType) => {
  if (value === 'SEMI_ANNUAL') return 'Semi-Annual';
  if (value === 'CUSTOM') return 'Custom';
  return 'Annual';
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const stripReuseSuffix = (value: string) => value.trim().replace(/\s*\(\d+\)$/, '').trim();

const nextReuseCycleName = (sourceName: string, existingCycles: AppraisalCycleResponse[]) => {
  const baseName = stripReuseSuffix(sourceName) || sourceName.trim();
  const suffixPattern = new RegExp(`^${escapeRegExp(baseName)}\\s*\\((\\d+)\\)$`, 'i');
  const usedNumbers = new Set<number>();
  existingCycles.forEach((cycle) => {
    const candidate = cycle.cycleName.trim();
    const match = suffixPattern.exec(candidate);
    if (match) usedNumbers.add(Number(match[1]));
  });
  let nextNumber = 1;
  while (usedNumbers.has(nextNumber)) nextNumber += 1;
  return `${baseName} (${nextNumber})`;
};

const getPeriodNo = (cycleType: AppraisalCycleType, startDate?: string | null) => {
  if (cycleType === 'ANNUAL' || cycleType === 'CUSTOM') return 1;
  const month = Number(startDate?.slice(5, 7));
  return month && month <= 6 ? 1 : 2;
};

const getComputedDates = (cycleType: AppraisalCycleType, cycleYear: number, startDate?: string | null, customEndDate?: string | null) => {
  if (cycleType === 'ANNUAL') {
    return { startDate: `${cycleYear}-01-01`, endDate: `${cycleYear}-12-31` };
  }
  if (cycleType === 'SEMI_ANNUAL') {
    const resolvedStart = startDate || `${cycleYear}-01-01`;
    return { startDate: resolvedStart, endDate: addMonthsMinusOneDay(resolvedStart) };
  }
  return { startDate: startDate || `${cycleYear}-01-01`, endDate: customEndDate || `${cycleYear}-12-31` };
};

const shiftIsoDate = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  date.setDate(date.getDate() + days);
  return formatIsoDateFromLocal(date);
};

const getDefaultSubmissionDeadline = (endDate?: string | null) => (endDate ? shiftIsoDate(endDate, -1) : '');

const emptyCycle = (): AppraisalCycleRequest => ({
  cycleName: '',
  templateId: 0,
  cycleType: 'ANNUAL',
  cycleYear: currentYear,
  periodNo: 1,
  startDate: `${currentYear}-01-01`,
  endDate: `${currentYear}-12-31`,
  submissionDeadline: getDefaultSubmissionDeadline(`${currentYear}-12-31`),
  managerSubmissionDeadline: getDefaultSubmissionDeadline(`${currentYear}-12-31`),
  deptHeadSubmissionDeadline: getDefaultSubmissionDeadline(`${currentYear}-12-31`),
  departmentIds: [],
});

const buildDateText = (cycle: AppraisalCycleRequest): DateTextState => ({
  startDate: displayDate(cycle.startDate),
  endDate: displayDate(cycle.endDate),
  submissionDeadline: cycle.submissionDeadline ? displayDate(cycle.submissionDeadline) : '',
  managerSubmissionDeadline: cycle.managerSubmissionDeadline ? displayDate(cycle.managerSubmissionDeadline) : cycle.submissionDeadline ? displayDate(cycle.submissionDeadline) : '',
  deptHeadSubmissionDeadline: cycle.deptHeadSubmissionDeadline ? displayDate(cycle.deptHeadSubmissionDeadline) : cycle.submissionDeadline ? displayDate(cycle.submissionDeadline) : '',
});

const makeCriteria = (criteriaText: string, sortOrder: number): AppraisalCriterionRequest => ({
  criteriaText,
  description: '',
  sortOrder,
  maxRating: 5,
  ratingRequired: true,
  active: true,
});

const templateToReusableForm = (template: AppraisalTemplateResponse): AppraisalTemplateRequest => ({
  templateName: template.templateName,
  description: template.description ?? '',
  appraiseeSignatureId: template.appraiseeSignatureId ?? null,
  appraiserSignatureId: template.appraiserSignatureId ?? null,
  hrSignatureId: template.hrSignatureId ?? null,
  signatureDateFormat: template.signatureDateFormat ?? 'DD/MM/YYYY',
  formType: 'ANNUAL',
  targetAllDepartments: true,
  departmentIds: [],
  sections: template.sections.map((section, sectionIndex) => ({
    sectionName: section.sectionName,
    description: section.description ?? '',
    sortOrder: section.sortOrder ?? sectionIndex + 1,
    active: true,
    criteria: section.criteria.map((criteria, criteriaIndex) => ({
      criteriaText: criteria.criteriaText,
      description: '',
      sortOrder: criteria.sortOrder ?? criteriaIndex + 1,
      maxRating: criteria.maxRating || 5,
      ratingRequired: criteria.ratingRequired ?? true,
      active: true,
    })),
  })),
  scoreBands: uniqueScoreBands(template.scoreBands?.length ? template.scoreBands : defaultScoreBands()).map((band, index) => ({
    minScore: clampScore(Number(band.minScore)),
    maxScore: clampScore(Number(band.maxScore)),
    label: band.label,
    description: band.description ?? '',
    sortOrder: index + 1,
    active: true,
  })),
});

const normalizeReusableTemplate = (form: AppraisalTemplateRequest, _cycleName: string, sourceCycleName: string): AppraisalTemplateRequest => ({
  ...form,
  templateName: form.templateName.trim(),
  description: `Internal cycle-only copy created from ${sourceCycleName}.`,
  cycleSpecificCopy: true,
  formType: 'ANNUAL',
  targetAllDepartments: true,
  departmentIds: [],
  sections: form.sections.map((section, sectionIndex) => ({
    ...section,
    id: undefined,
    sectionName: section.sectionName.trim(),
    description: section.description?.trim() ?? '',
    sortOrder: sectionIndex + 1,
    active: true,
    criteria: section.criteria.map((criteria, criteriaIndex) => ({
      ...criteria,
      id: undefined,
      criteriaText: criteria.criteriaText.trim(),
      description: '',
      sortOrder: criteriaIndex + 1,
      maxRating: criteria.maxRating || 5,
      ratingRequired: true,
      active: true,
    })),
  })),
  scoreBands: uniqueScoreBands(form.scoreBands?.length ? form.scoreBands : defaultScoreBands()).map((band, index) => ({
    minScore: clampScore(Number(band.minScore)),
    maxScore: clampScore(Number(band.maxScore)),
    label: band.label,
    description: band.description ?? '',
    sortOrder: index + 1,
    active: true,
  })),
});

const AppraisalCyclesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cycles, setCycles] = useState<AppraisalCycleResponse[]>([]);
  const [templates, setTemplates] = useState<AppraisalTemplateResponse[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [cycleForm, setCycleForm] = useState<AppraisalCycleRequest>(() => emptyCycle());
  const [cycleYearText, setCycleYearText] = useState(String(currentYear));
  const [dateText, setDateText] = useState<DateTextState>(() => buildDateText(emptyCycle()));
  const [targetAllDepartments, setTargetAllDepartments] = useState(true);
  const [selectedCycle, setSelectedCycle] = useState<AppraisalCycleResponse | null>(null);
  const [selectedCycleTemplate, setSelectedCycleTemplate] = useState<AppraisalTemplateResponse | null>(null);
  const [cycleViewLoading, setCycleViewLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [reuseSourceCycle, setReuseSourceCycle] = useState<AppraisalCycleResponse | null>(null);
  const [reuseForm, setReuseForm] = useState<AppraisalCycleRequest>(() => emptyCycle());
  const [reuseYearText, setReuseYearText] = useState(String(currentYear));
  const [reuseDateText, setReuseDateText] = useState<DateTextState>(() => buildDateText(emptyCycle()));
  const [reuseAllDepartments, setReuseAllDepartments] = useState(true);
  const [reuseTemplateForm, setReuseTemplateForm] = useState<AppraisalTemplateRequest | null>(null);
  const [reuseTemplateLoading, setReuseTemplateLoading] = useState(false);
  const [reuseMode, setReuseMode] = useState<'reuse' | 'edit'>('reuse');
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [cycleSearch, setCycleSearch] = useState('');
  const [cycleTemplateFilter, setCycleTemplateFilter] = useState('');
  const [cycleDepartmentFilter, setCycleDepartmentFilter] = useState('');
  const [cycleTypeFilter, setCycleTypeFilter] = useState('');
  const [cycleYearFilter, setCycleYearFilter] = useState('');
  const [editRecordsTitle, setEditRecordsTitle] = useState('');
  const [editRecords, setEditRecords] = useState<AppraisalAuditLog[]>([]);
  const [editRecordsLoading, setEditRecordsLoading] = useState(false);

  const signatureById = useMemo(() => new Map(signatures.map((signature) => [signature.id, signature])), [signatures]);

  const computedDates = useMemo(
    () => getComputedDates(cycleForm.cycleType, cycleForm.cycleYear, cycleForm.startDate, cycleForm.endDate),
    [cycleForm.cycleType, cycleForm.cycleYear, cycleForm.startDate, cycleForm.endDate],
  );

  const reuseComputedDates = useMemo(
    () => getComputedDates(reuseForm.cycleType, reuseForm.cycleYear, reuseForm.startDate, reuseForm.endDate),
    [reuseForm.cycleType, reuseForm.cycleYear, reuseForm.startDate, reuseForm.endDate],
  );

  const cycleTemplateOptions = useMemo(() => {
    const optionMap = new Map<number, string>();
    cycles.forEach((cycle) => optionMap.set(cycle.templateId, cycle.templateName || `Template #${cycle.templateId}`));
    return Array.from(optionMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [cycles]);

  const cycleDepartmentOptions = useMemo(() => {
    const optionMap = new Map<number, string>();
    departments.forEach((department) => optionMap.set(department.id, department.departmentName));
    cycles.forEach((cycle) => {
      cycle.departmentIds.forEach((departmentId, index) => {
        optionMap.set(departmentId, cycle.departmentNames?.[index] || optionMap.get(departmentId) || `Department #${departmentId}`);
      });
    });
    return Array.from(optionMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [cycles, departments]);

  const cycleYearFilterOptions = useMemo(() => {
    const years = new Set<number>();
    cycles.forEach((cycle) => years.add(cycle.cycleYear));
    return Array.from(years).sort((a, b) => b - a);
  }, [cycles]);

  const filteredCycles = useMemo(() => {
    const searchText = cycleSearch.trim().toLowerCase();
    const selectedDepartmentId = cycleDepartmentFilter ? Number(cycleDepartmentFilter) : null;
    return cycles.filter((cycle) => {
      const nameMatches = !searchText || cycle.cycleName.toLowerCase().includes(searchText);
      const templateMatches = !cycleTemplateFilter || String(cycle.templateId) === cycleTemplateFilter;
      const departmentMatches = selectedDepartmentId === null || cycle.departmentIds.length === 0 || cycle.departmentIds.includes(selectedDepartmentId);
      const typeMatches = !cycleTypeFilter || cycle.cycleType === cycleTypeFilter;
      const yearMatches = !cycleYearFilter || String(cycle.cycleYear) === cycleYearFilter;
      return nameMatches && templateMatches && departmentMatches && typeMatches && yearMatches;
    });
  }, [cycleDepartmentFilter, cycleSearch, cycleTemplateFilter, cycleTypeFilter, cycleYearFilter, cycles]);

  const clearCycleFilters = () => {
    setCycleSearch('');
    setCycleTemplateFilter('');
    setCycleDepartmentFilter('');
    setCycleTypeFilter('');
    setCycleYearFilter('');
  };

  const showPopup = (nextPopup: PopupState) => setPopup(nextPopup);

  const closePopup = () => setPopup(null);

  const handlePopupOk = () => {
    const handler = popup?.onOk;
    setPopup(null);
    if (handler) void handler();
  };

  const handlePopupConfirm = () => {
    const handler = popup?.onConfirm;
    setPopup(null);
    if (handler) void handler();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [cycleList, templateList, departmentList] = await Promise.all([
        appraisalCycleService.list(),
        appraisalTemplateService.list(),
        fetchDepartments(),
      ]);
      setCycles(cycleList);
      setTemplates(templateList);
      setDepartments(departmentList.filter((department) => department.status !== false));
      setSelectedCycle((previous) => (previous ? cycleList.find((cycle) => cycle.id === previous.id) ?? null : null));
    } catch (error) {
      showPopup({ title: 'Load Failed', message: extractApiErrorMessage(error, 'Appraisal cycles could not be loaded.'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    signatureService.list().then(setSignatures).catch(() => setSignatures([]));
  }, []);

  useEffect(() => {
    const requestedTemplateId = Number(searchParams.get('templateId') || 0);
    const shouldOpen = searchParams.get('openCreate') === '1' || requestedTemplateId > 0;
    if (shouldOpen) {
      setShowCreateModal(true);
      if (requestedTemplateId > 0) setCycleForm((previous) => ({ ...previous, templateId: requestedTemplateId }));
    }
  }, [searchParams]);

  const resetForm = (templateId = 0) => {
    const fresh = { ...emptyCycle(), templateId };
    setCycleForm(fresh);
    setCycleYearText(String(currentYear));
    setDateText(buildDateText(fresh));
    setTargetAllDepartments(true);
  };

  const openCreateModal = (templateId = 0) => {
    resetForm(templateId);
    setShowCreateModal(true);
    if (templateId > 0) setSearchParams({ templateId: String(templateId), openCreate: '1' });
    else setSearchParams({ openCreate: '1' });
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setSearchParams({});
  };

  const openCycleView = async (cycle: AppraisalCycleResponse) => {
    setSelectedCycle(cycle);
    setSelectedCycleTemplate(null);
    setCycleViewLoading(true);
    try {
      const template = await appraisalTemplateService.get(cycle.templateId);
      setSelectedCycleTemplate(template);
    } catch (error) {
      showPopup({ title: 'Load Failed', message: extractApiErrorMessage(error, 'Failed to load selected cycle template.'), type: 'error' });
    } finally {
      setCycleViewLoading(false);
    }
  };

  const closeCycleView = () => {
    setSelectedCycle(null);
    setSelectedCycleTemplate(null);
  };

  const openEditRecords = async (cycle: AppraisalCycleResponse) => {
    setEditRecordsTitle(cycle.cycleName);
    setEditRecords([]);
    setEditRecordsLoading(true);
    try {
      const records = await appraisalAuditService.list('APPRAISAL_CYCLE', cycle.id);
      setEditRecords(records);
    } catch (error) {
      showPopup({ title: 'Load Failed', message: extractApiErrorMessage(error, 'Edit records could not be loaded.'), type: 'error' });
      setEditRecordsTitle('');
    } finally {
      setEditRecordsLoading(false);
    }
  };

  const closeEditRecords = () => {
    setEditRecordsTitle('');
    setEditRecords([]);
    setEditRecordsLoading(false);
  };

  const buildReusePayload = (cycle: AppraisalCycleResponse): AppraisalCycleRequest => {
    const nextYear = Math.max(cycle.cycleYear + 1, currentYear);
    const nextStartDate = cycle.cycleType === 'ANNUAL' ? `${nextYear}-01-01` : addOneYear(cycle.startDate) || `${nextYear}-01-01`;
    const nextEndDate = cycle.cycleType === 'CUSTOM' ? addOneYear(cycle.endDate) || `${nextYear}-12-31` : undefined;
    const computed = getComputedDates(cycle.cycleType, nextYear, nextStartDate, nextEndDate);
    return {
      cycleName: nextReuseCycleName(cycle.cycleName, cycles),
      templateId: cycle.templateId,
      cycleType: cycle.cycleType,
      cycleYear: nextYear,
      periodNo: getPeriodNo(cycle.cycleType, computed.startDate),
      startDate: computed.startDate,
      endDate: computed.endDate,
      submissionDeadline: getDefaultSubmissionDeadline(computed.endDate),
      managerSubmissionDeadline: getDefaultSubmissionDeadline(computed.endDate),
      deptHeadSubmissionDeadline: getDefaultSubmissionDeadline(computed.endDate),
      departmentIds: cycle.departmentIds ?? [],
    };
  };

  const openReuseModal = async (cycle: AppraisalCycleResponse) => {
    setReuseMode('reuse');
    const payload = buildReusePayload(cycle);
    setReuseSourceCycle(cycle);
    setReuseForm(payload);
    setReuseYearText(String(payload.cycleYear));
    setReuseDateText(buildDateText(payload));
    setReuseAllDepartments(!payload.departmentIds.length);
    setReuseTemplateForm(null);
    setReuseTemplateLoading(true);
    try {
      const template = await appraisalTemplateService.get(cycle.templateId);
      setReuseTemplateForm(templateToReusableForm(template));
    } catch (error) {
      showPopup({ title: 'Load Failed', message: extractApiErrorMessage(error, 'Template form for this cycle could not be loaded.'), type: 'error' });
      setReuseSourceCycle(null);
    } finally {
      setReuseTemplateLoading(false);
    }
  };


  const buildEditPayload = (cycle: AppraisalCycleResponse): AppraisalCycleRequest => ({
    cycleName: cycle.cycleName,
    description: cycle.description ?? null,
    templateId: cycle.templateId,
    cycleType: cycle.cycleType,
    cycleYear: cycle.cycleYear,
    periodNo: cycle.periodNo ?? getPeriodNo(cycle.cycleType, cycle.startDate),
    startDate: cycle.startDate,
    endDate: cycle.endDate,
    submissionDeadline: cycle.submissionDeadline,
    managerSubmissionDeadline: cycle.managerSubmissionDeadline ?? cycle.submissionDeadline,
    deptHeadSubmissionDeadline: cycle.deptHeadSubmissionDeadline ?? cycle.submissionDeadline,
    departmentIds: cycle.departmentIds ?? [],
  });

  const openEditCycle = async (cycle: AppraisalCycleResponse) => {
    const payload = buildEditPayload(cycle);
    setReuseMode('edit');
    setReuseSourceCycle(cycle);
    setReuseForm(payload);
    setReuseYearText(String(payload.cycleYear));
    setReuseDateText(buildDateText(payload));
    setReuseAllDepartments(!payload.departmentIds.length);
    setReuseTemplateForm(null);
    setReuseTemplateLoading(true);
    try {
      const template = await appraisalTemplateService.get(cycle.templateId);
      setReuseTemplateForm(templateToReusableForm(template));
    } catch (error) {
      showPopup({ title: 'Load Failed', message: extractApiErrorMessage(error, 'Template form for this cycle could not be loaded.'), type: 'error' });
      setReuseSourceCycle(null);
    } finally {
      setReuseTemplateLoading(false);
    }
  };

  const closeReuseModal = () => {
    setReuseSourceCycle(null);
    setReuseTemplateForm(null);
  };

  const setCycleType = (cycleType: AppraisalCycleType) => {
    setCycleForm((previous) => {
      const dates = getComputedDates(cycleType, previous.cycleYear, `${previous.cycleYear}-01-01`, `${previous.cycleYear}-12-31`);
      const submissionDeadline = getDefaultSubmissionDeadline(dates.endDate);
      const next = { ...previous, cycleType, startDate: dates.startDate, endDate: dates.endDate, submissionDeadline, managerSubmissionDeadline: submissionDeadline, deptHeadSubmissionDeadline: submissionDeadline, periodNo: getPeriodNo(cycleType, dates.startDate) };
      setDateText((prev) => ({ ...prev, startDate: displayDate(next.startDate), endDate: displayDate(next.endDate), submissionDeadline: displayDate(submissionDeadline), managerSubmissionDeadline: displayDate(submissionDeadline), deptHeadSubmissionDeadline: displayDate(submissionDeadline) }));
      return next;
    });
  };

  const setReuseCycleType = (cycleType: AppraisalCycleType) => {
    setReuseForm((previous) => {
      const dates = getComputedDates(cycleType, previous.cycleYear, `${previous.cycleYear}-01-01`, `${previous.cycleYear}-12-31`);
      const submissionDeadline = getDefaultSubmissionDeadline(dates.endDate);
      const next = { ...previous, cycleType, startDate: dates.startDate, endDate: dates.endDate, submissionDeadline, managerSubmissionDeadline: submissionDeadline, deptHeadSubmissionDeadline: submissionDeadline, periodNo: getPeriodNo(cycleType, dates.startDate) };
      setReuseDateText((prev) => ({ ...prev, startDate: displayDate(next.startDate), endDate: displayDate(next.endDate), submissionDeadline: displayDate(submissionDeadline), managerSubmissionDeadline: displayDate(submissionDeadline), deptHeadSubmissionDeadline: displayDate(submissionDeadline) }));
      return next;
    });
  };

  const setCycleYear = (value: string) => {
    setCycleYearText(value);
    const year = Number(value);
    if (!Number.isInteger(year)) return;
    setCycleForm((previous) => {
      const dates = getComputedDates(previous.cycleType, year, `${year}-01-01`, `${year}-12-31`);
      const submissionDeadline = getDefaultSubmissionDeadline(dates.endDate);
      const next = { ...previous, cycleYear: year, startDate: dates.startDate, endDate: dates.endDate, submissionDeadline, managerSubmissionDeadline: submissionDeadline, deptHeadSubmissionDeadline: submissionDeadline, periodNo: getPeriodNo(previous.cycleType, dates.startDate) };
      setDateText((prev) => ({ ...prev, startDate: displayDate(next.startDate), endDate: displayDate(next.endDate), submissionDeadline: displayDate(submissionDeadline), managerSubmissionDeadline: displayDate(submissionDeadline), deptHeadSubmissionDeadline: displayDate(submissionDeadline) }));
      return next;
    });
  };

  const setReuseCycleYear = (value: string) => {
    setReuseYearText(value);
    const year = Number(value);
    if (!Number.isInteger(year)) return;
    setReuseForm((previous) => {
      const dates = getComputedDates(previous.cycleType, year, `${year}-01-01`, `${year}-12-31`);
      const submissionDeadline = getDefaultSubmissionDeadline(dates.endDate);
      const next = { ...previous, cycleYear: year, startDate: dates.startDate, endDate: dates.endDate, submissionDeadline, managerSubmissionDeadline: submissionDeadline, deptHeadSubmissionDeadline: submissionDeadline, periodNo: getPeriodNo(previous.cycleType, dates.startDate) };
      setReuseDateText((prev) => ({ ...prev, startDate: displayDate(next.startDate), endDate: displayDate(next.endDate), submissionDeadline: displayDate(submissionDeadline), managerSubmissionDeadline: displayDate(submissionDeadline), deptHeadSubmissionDeadline: displayDate(submissionDeadline) }));
      return next;
    });
  };

  const updateDateText = (field: keyof DateTextState, value: string) => {
    setDateText((previous) => ({ ...previous, [field]: value }));
    const parsed = parseDisplayDate(value);
    if (!parsed) return;
    setCycleForm((previous) => {
      if (field === 'startDate') {
        const computed = getComputedDates(previous.cycleType, previous.cycleYear, parsed, previous.endDate);
        const submissionDeadline = getDefaultSubmissionDeadline(computed.endDate);
        setDateText((prev) => ({ ...prev, endDate: displayDate(computed.endDate), submissionDeadline: displayDate(submissionDeadline), managerSubmissionDeadline: displayDate(submissionDeadline), deptHeadSubmissionDeadline: displayDate(submissionDeadline) }));
        return { ...previous, startDate: computed.startDate, endDate: computed.endDate, submissionDeadline, managerSubmissionDeadline: submissionDeadline, deptHeadSubmissionDeadline: submissionDeadline, periodNo: getPeriodNo(previous.cycleType, computed.startDate) };
      }
      if (field === 'endDate') {
        const submissionDeadline = getDefaultSubmissionDeadline(parsed);
        setDateText((prev) => ({ ...prev, submissionDeadline: displayDate(submissionDeadline), managerSubmissionDeadline: displayDate(submissionDeadline), deptHeadSubmissionDeadline: displayDate(submissionDeadline) }));
        return { ...previous, endDate: parsed, submissionDeadline, managerSubmissionDeadline: submissionDeadline, deptHeadSubmissionDeadline: submissionDeadline };
      }
      if (field === 'managerSubmissionDeadline') return { ...previous, managerSubmissionDeadline: parsed };
      if (field === 'deptHeadSubmissionDeadline') return { ...previous, deptHeadSubmissionDeadline: parsed, submissionDeadline: parsed };
      return { ...previous, submissionDeadline: parsed, managerSubmissionDeadline: parsed, deptHeadSubmissionDeadline: parsed };
    });
  };

  const updateReuseDateText = (field: keyof DateTextState, value: string) => {
    setReuseDateText((previous) => ({ ...previous, [field]: value }));
    const parsed = parseDisplayDate(value);
    if (!parsed) return;
    setReuseForm((previous) => {
      if (field === 'startDate') {
        const computed = getComputedDates(previous.cycleType, previous.cycleYear, parsed, previous.endDate);
        const submissionDeadline = getDefaultSubmissionDeadline(computed.endDate);
        setReuseDateText((prev) => ({ ...prev, endDate: displayDate(computed.endDate), submissionDeadline: displayDate(submissionDeadline), managerSubmissionDeadline: displayDate(submissionDeadline), deptHeadSubmissionDeadline: displayDate(submissionDeadline) }));
        return { ...previous, startDate: computed.startDate, endDate: computed.endDate, submissionDeadline, managerSubmissionDeadline: submissionDeadline, deptHeadSubmissionDeadline: submissionDeadline, periodNo: getPeriodNo(previous.cycleType, computed.startDate) };
      }
      if (field === 'endDate') {
        const submissionDeadline = getDefaultSubmissionDeadline(parsed);
        setReuseDateText((prev) => ({ ...prev, submissionDeadline: displayDate(submissionDeadline), managerSubmissionDeadline: displayDate(submissionDeadline), deptHeadSubmissionDeadline: displayDate(submissionDeadline) }));
        return { ...previous, endDate: parsed, submissionDeadline, managerSubmissionDeadline: submissionDeadline, deptHeadSubmissionDeadline: submissionDeadline };
      }
      if (field === 'managerSubmissionDeadline') return { ...previous, managerSubmissionDeadline: parsed };
      if (field === 'deptHeadSubmissionDeadline') return { ...previous, deptHeadSubmissionDeadline: parsed, submissionDeadline: parsed };
      return { ...previous, submissionDeadline: parsed, managerSubmissionDeadline: parsed, deptHeadSubmissionDeadline: parsed };
    });
  };

  const updateDateFromCalendar = (field: keyof DateTextState, value: string, reuse = false) => {
    if (!value) return;
    const displayValue = displayDate(value);
    if (reuse) updateReuseDateText(field, displayValue);
    else updateDateText(field, displayValue);
  };

  const toggleDepartment = (departmentId: number, reuse = false) => {
    if (reuse) {
      setReuseForm((previous) => {
        const hasDepartment = previous.departmentIds.includes(departmentId);
        return { ...previous, departmentIds: hasDepartment ? previous.departmentIds.filter((id) => id !== departmentId) : [...previous.departmentIds, departmentId] };
      });
      return;
    }
    setCycleForm((previous) => {
      const hasDepartment = previous.departmentIds.includes(departmentId);
      return { ...previous, departmentIds: hasDepartment ? previous.departmentIds.filter((id) => id !== departmentId) : [...previous.departmentIds, departmentId] };
    });
  };

  const validateCyclePayload = (form: AppraisalCycleRequest, yearText: string, dates: DateTextState, allDepartments: boolean) => {
    const year = Number(yearText);
    if (!Number.isInteger(year)) return 'Cycle year must be a valid year.';
    if (year < currentYear) return 'Past years cannot be selected.';
    if (!form.cycleName.trim()) return 'Appraisal name is required.';
    if (!form.templateId) return 'Select a template form record.';
    if (form.cycleType !== 'ANNUAL' && !parseDisplayDate(dates.startDate)) return 'Start date must use DD/MM/YYYY format.';
    if (form.cycleType === 'CUSTOM' && !parseDisplayDate(dates.endDate)) return 'End date must use DD/MM/YYYY format.';
    if (!parseDisplayDate(dates.managerSubmissionDeadline)) return 'Manager submission deadline must use DD/MM/YYYY format.';
    if (!parseDisplayDate(dates.deptHeadSubmissionDeadline)) return 'Dept Head submission deadline must use DD/MM/YYYY format.';
    const computedDates = getComputedDates(form.cycleType, year, form.startDate, form.endDate);
    if (form.cycleType === 'CUSTOM' && form.startDate && form.endDate && form.endDate < form.startDate) return 'End date cannot be before start date.';
    const managerDeadline = form.managerSubmissionDeadline || form.submissionDeadline;
    const deptHeadDeadline = form.deptHeadSubmissionDeadline || form.submissionDeadline;
    if (managerDeadline < computedDates.startDate) return 'Manager submission deadline cannot be before start date.';
    if (managerDeadline >= computedDates.endDate) return 'Manager submission deadline must be before end date.';
    if (deptHeadDeadline < computedDates.startDate) return 'Dept Head submission deadline cannot be before start date.';
    if (deptHeadDeadline >= computedDates.endDate) return 'Dept Head submission deadline must be before end date.';
    if (deptHeadDeadline < managerDeadline) return 'Dept Head submission deadline cannot be before Manager deadline.';
    if (!allDepartments && form.departmentIds.length === 0) return 'Select at least one department or choose all departments.';
    return '';
  };

  const validateReusableTemplate = () => {
    if (!reuseTemplateForm) return 'Reusable template form is not ready.';
    if (!reuseTemplateForm.sections.length) return 'At least one section is required.';
    for (const section of reuseTemplateForm.sections) {
      if (!section.sectionName.trim()) return 'Section name is required.';
      if (!section.criteria.length) return `At least one criteria is required in ${section.sectionName || 'each section'}.`;
      for (const criteria of section.criteria) {
        if (!criteria.criteriaText.trim()) return 'Criteria text is required.';
      }
    }
    const bands = uniqueScoreBands(reuseTemplateForm.scoreBands?.length ? reuseTemplateForm.scoreBands : defaultScoreBands());
    for (const band of bands) {
      if (Number(band.minScore) < 0 || Number(band.maxScore) > 100 || Number(band.minScore) > Number(band.maxScore)) return 'Score ranges must be between 0 and 100.';
    }
    return '';
  };

  const runAction = async (action: () => Promise<unknown>, doneMessage: string) => {
    setLoading(true);
    try {
      await action();
      await loadData();
      showPopup({ title: 'Success', message: doneMessage, type: 'success' });
    } catch (error) {
      showPopup({ title: 'Error', message: extractApiErrorMessage(error, 'Action failed.'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const askActivateCycle = (cycle: AppraisalCycleResponse) => {
    showPopup({
      title: 'Confirm Active Cycle',
      message: `Are you sure you want to activate "${cycle.cycleName}"? Managers from the selected departments will receive a notification.`,
      type: 'confirm',
      confirmText: 'Submit',
      cancelText: 'Cancel',
      onConfirm: () => runAction(() => appraisalCycleService.activate(cycle.id), 'Cycle activated.'),
    });
  };

  const createCycle = async () => {
    const validationMessage = validateCyclePayload(cycleForm, cycleYearText, dateText, targetAllDepartments);
    if (validationMessage) {
      showPopup({ title: 'Validation Error', message: validationMessage, type: 'error' });
      return;
    }
    const year = Number(cycleYearText);
    const dates = getComputedDates(cycleForm.cycleType, year, cycleForm.startDate, cycleForm.endDate);
    setLoading(true);
    try {
      await appraisalCycleService.create({
        ...cycleForm,
        cycleName: cycleForm.cycleName.trim(),
        cycleYear: year,
        startDate: dates.startDate,
        endDate: dates.endDate,
        periodNo: getPeriodNo(cycleForm.cycleType, dates.startDate),
        submissionDeadline: cycleForm.deptHeadSubmissionDeadline || cycleForm.submissionDeadline,
        managerSubmissionDeadline: cycleForm.managerSubmissionDeadline || cycleForm.submissionDeadline,
        deptHeadSubmissionDeadline: cycleForm.deptHeadSubmissionDeadline || cycleForm.submissionDeadline,
        departmentIds: targetAllDepartments ? [] : cycleForm.departmentIds,
      });
      await loadData();
      showPopup({
        title: 'Success',
        message: 'Appraisal cycle created successfully as a draft record.',
        type: 'success',
        onOk: () => {
          resetForm();
          closeCreateModal();
        },
      });
    } catch (error) {
      showPopup({ title: 'Create Failed', message: extractApiErrorMessage(error, 'Appraisal cycle create failed.'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const askReuseSubmit = () => {
    const validationMessage = validateCyclePayload(reuseForm, reuseYearText, reuseDateText, reuseAllDepartments) || validateReusableTemplate();
    if (validationMessage) {
      showPopup({ title: 'Validation Error', message: validationMessage, type: 'error' });
      return;
    }
    showPopup({
      title: reuseMode === 'edit' ? 'Confirm Update Cycle' : 'Confirm Re-use Cycle',
      message: reuseMode === 'edit' ? 'Save changes to this draft appraisal cycle?' : 'Are you sure you want to save this re-used appraisal cycle as a new draft record?',
      type: 'confirm',
      confirmText: 'Submit',
      cancelText: 'Cancel',
      onConfirm: submitReuseCycle,
    });
  };

  const submitReuseCycle = async () => {
    if (!reuseSourceCycle || !reuseTemplateForm) return;
    const year = Number(reuseYearText);
    const dates = getComputedDates(reuseForm.cycleType, year, reuseForm.startDate, reuseForm.endDate);
    setLoading(true);
    try {
      const cycleTemplateCopy = await appraisalTemplateService.create(normalizeReusableTemplate(reuseTemplateForm, reuseForm.cycleName, reuseSourceCycle.cycleName));
      const payload = {
        ...reuseForm,
        templateId: cycleTemplateCopy.id,
        cycleName: reuseForm.cycleName.trim(),
        cycleYear: year,
        startDate: dates.startDate,
        endDate: dates.endDate,
        periodNo: getPeriodNo(reuseForm.cycleType, dates.startDate),
        submissionDeadline: reuseForm.deptHeadSubmissionDeadline || reuseForm.submissionDeadline,
        managerSubmissionDeadline: reuseForm.managerSubmissionDeadline || reuseForm.submissionDeadline,
        deptHeadSubmissionDeadline: reuseForm.deptHeadSubmissionDeadline || reuseForm.submissionDeadline,
        departmentIds: reuseAllDepartments ? [] : reuseForm.departmentIds,
      };
      if (reuseMode === 'edit') {
        await appraisalCycleService.updateDraft(reuseSourceCycle.id, payload);
      } else {
        await appraisalCycleService.create(payload);
      }
      await loadData();
      showPopup({
        title: 'Success',
        message: reuseMode === 'edit' ? 'Draft appraisal cycle updated successfully.' : 'Re-used appraisal cycle saved successfully as a new draft record.',
        type: 'success',
        onOk: closeReuseModal,
      });
    } catch (error) {
      showPopup({ title: 'Re-use Failed', message: extractApiErrorMessage(error, 'Re-use cycle failed.'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const updateReuseSection = (sectionIndex: number, patch: Partial<AppraisalSectionRequest>) => {
    setReuseTemplateForm((previous) => previous ? {
      ...previous,
      sections: previous.sections.map((section, index) => (index === sectionIndex ? { ...section, ...patch } : section)),
    } : previous);
  };

  const updateReuseCriteria = (sectionIndex: number, criteriaIndex: number, patch: Partial<AppraisalCriterionRequest>) => {
    setReuseTemplateForm((previous) => previous ? {
      ...previous,
      sections: previous.sections.map((section, index) => {
        if (index !== sectionIndex) return section;
        return { ...section, criteria: section.criteria.map((criteria, innerIndex) => (innerIndex === criteriaIndex ? { ...criteria, ...patch } : criteria)) };
      }),
    } : previous);
  };

  const addReuseSection = () => {
    setReuseTemplateForm((previous) => previous ? {
      ...previous,
      sections: [...previous.sections, { sectionName: '', description: '', sortOrder: previous.sections.length + 1, active: true, criteria: [] }],
    } : previous);
  };

  const removeReuseSection = (sectionIndex: number) => {
    setReuseTemplateForm((previous) => previous ? { ...previous, sections: previous.sections.filter((_, index) => index !== sectionIndex) } : previous);
  };

  const addReuseCriteria = (sectionIndex: number) => {
    setReuseTemplateForm((previous) => previous ? {
      ...previous,
      sections: previous.sections.map((section, index) => (index === sectionIndex ? { ...section, criteria: [...section.criteria, makeCriteria('', section.criteria.length + 1)] } : section)),
    } : previous);
  };

  const removeReuseCriteria = (sectionIndex: number, criteriaIndex: number) => {
    setReuseTemplateForm((previous) => previous ? {
      ...previous,
      sections: previous.sections.map((section, index) => (index === sectionIndex ? { ...section, criteria: section.criteria.filter((_, innerIndex) => innerIndex !== criteriaIndex) } : section)),
    } : previous);
  };

  const updateReuseScoreBand = (bandIndex: number, patch: Partial<AppraisalScoreBandRequest>) => {
    setReuseTemplateForm((previous) => previous ? {
      ...previous,
      scoreBands: uniqueScoreBands(previous.scoreBands?.length ? previous.scoreBands : defaultScoreBands()).map((band, index) => (
        index === bandIndex ? { ...band, ...patch } : band
      )),
    } : previous);
  };

  const renderDatePickerField = ({
    label,
    field,
    textValue,
    isoValue,
    disabled,
    helper,
    reuse = false,
  }: {
    label: string;
    field: keyof DateTextState;
    textValue: string;
    isoValue?: string | null;
    disabled?: boolean;
    helper?: string;
    reuse?: boolean;
  }) => (
    <label className="appraisal-field">
      <span>{label}</span>
      <div className="appraisal-date-picker-wrap">
        <input
          disabled={disabled}
          value={textValue}
          onChange={(event) => (reuse ? updateReuseDateText(field, event.target.value) : updateDateText(field, event.target.value))}
          placeholder="DD/MM/YYYY"
        />
        <label className={`appraisal-calendar-icon-button ${disabled ? 'disabled' : ''}`} title="Choose from calendar">
          <i className="bi bi-calendar3" />
          <input
            type="date"
            disabled={disabled}
            value={isoValue?.slice(0, 10) ?? ''}
            onChange={(event) => updateDateFromCalendar(field, event.target.value, reuse)}
            aria-label={`${label} calendar`}
          />
        </label>
      </div>
      {helper && <small>{helper}</small>}
    </label>
  );

  const renderScoreGuide = (template: AppraisalTemplateResponse) => {
    const bands = uniqueScoreBands(template.scoreBands?.length ? template.scoreBands : defaultScoreBands());
    return (
      <div className="appraisal-score-band-editor read-only">
        <div className="appraisal-score-band-head">
          <span>Score</span>
          <span>Rating</span>
          <span>Explanation</span>
        </div>
        {bands.map((band, index) => (
          <div className="appraisal-score-band-row" key={`${band.label}-${index}`}>
            <div className="appraisal-score-range-inputs"><strong>{String(band.minScore).padStart(2, '0')}-{band.maxScore}</strong></div>
            <strong>{band.label}</strong>
            <span className="appraisal-muted">{band.description}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderReuseScoreEditor = () => {
    if (!reuseTemplateForm) return null;
    const bands = uniqueScoreBands(reuseTemplateForm.scoreBands?.length ? reuseTemplateForm.scoreBands : defaultScoreBands());
    return (
      <div className="appraisal-score-band-editor">
        <div className="appraisal-score-band-head">
          <span>Score</span>
          <span>Rating</span>
          <span>Explanation</span>
        </div>
        {bands.map((band, index) => (
          <div className="appraisal-score-band-row" key={`${band.label}-${index}`}>
            <div className="appraisal-score-range-inputs">
              <input
                type="number"
                min={0}
                max={100}
                value={band.minScore}
                onChange={(event) => updateReuseScoreBand(index, { minScore: clampScore(Number(event.target.value)) })}
              />
              <span>-</span>
              <input
                type="number"
                min={0}
                max={100}
                value={band.maxScore}
                onChange={(event) => updateReuseScoreBand(index, { maxScore: clampScore(Number(event.target.value)) })}
              />
            </div>
            <strong>{band.label}</strong>
            <span className="appraisal-muted">{band.description}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderSignaturePreview = (template: AppraisalTemplateResponse | AppraisalTemplateRequest) => {
    const dateFormat = template.signatureDateFormat ?? 'DD/MM/YYYY';
    const dateText = formatDateByPattern(new Date(), dateFormat);
    return (
      <div className="appraisal-form-block">
        <h3>Signature Section</h3>
        <div className="appraisal-signature-grid appraisal-template-signature-grid">
          <SignatureDisplayBlock label="Signature of Appraisee & Date" signature={template.appraiseeSignatureId ? signatureById.get(template.appraiseeSignatureId) : undefined} dateText={dateText} />
          <SignatureDisplayBlock label="Signature of Appraiser & Date" signature={template.appraiserSignatureId ? signatureById.get(template.appraiserSignatureId) : undefined} dateText={dateText} />
          <SignatureDisplayBlock label="HR Signature / Date / Designation" signature={template.hrSignatureId ? signatureById.get(template.hrSignatureId) : undefined} dateText={dateText} />
        </div>
      </div>
    );
  };

  const renderPopup = () => {
    if (!popup) return null;
    const isConfirm = popup.type === 'confirm';
    return (
      <div className="appraisal-popup-backdrop">
        <div className={`appraisal-popup-box ${popup.type ?? 'info'}`}>
          <div className="appraisal-popup-icon"><i className={`bi ${popup.type === 'success' ? 'bi-check-circle' : popup.type === 'error' ? 'bi-exclamation-circle' : popup.type === 'confirm' ? 'bi-question-circle' : 'bi-info-circle'}`} /></div>
          <h3>{popup.title}</h3>
          <p>{popup.message}</p>
          <div className="appraisal-popup-actions">
            {isConfirm ? (
              <>
                <button className="appraisal-button secondary" type="button" onClick={closePopup}>{popup.cancelText ?? 'Cancel'}</button>
                <button className="appraisal-button primary" type="button" onClick={handlePopupConfirm}>{popup.confirmText ?? 'Submit'}</button>
              </>
            ) : (
              <button className="appraisal-button primary" type="button" onClick={handlePopupOk}>Okay</button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCycleFormPreview = () => {
    if (!selectedCycle) return null;
    let globalNo = 0;
    return (
      <div className="appraisal-modal-backdrop">
        <div className="appraisal-modal-box appraisal-modal-box-xl appraisal-cycle-view-modal">
          <div className="appraisal-modal-header">
            <div><h2>View Appraisal Cycle</h2><p>{selectedCycle.cycleName}</p></div>
            <button className="appraisal-modal-close" type="button" onClick={closeCycleView}><i className="bi bi-x-lg" /></button>
          </div>
          <div className="appraisal-modal-body template-form-modal-body">
            {cycleViewLoading && <div className="appraisal-empty">Loading appraisal cycle form...</div>}
            {!cycleViewLoading && !selectedCycleTemplate && <div className="appraisal-empty">Selected template form could not be loaded.</div>}
            {!cycleViewLoading && selectedCycleTemplate && (
              <>
                <div className="appraisal-template-summary-card appraisal-cycle-summary-card compact-summary">
                  <div><strong>Appraisal Name</strong><span>{selectedCycle.cycleName}</span></div>
                  <div><strong>Template</strong><span>{selectedCycle.templateName || selectedCycleTemplate.templateName}</span></div>
                  <div><strong>Cycle Type</strong><span>{formatCycleType(selectedCycle.cycleType)}</span></div>
                  <div><strong>Cycle Year</strong><span>{selectedCycle.cycleYear}</span></div>
                </div>
                <div className="appraisal-form-block">
                  <h3>Employee Information</h3>
                  <div className="appraisal-inline-grid three appraisal-cycle-employee-grid">
                    <label className="appraisal-field"><span>Employee Name</span><input value="" placeholder="Filled by Project Manager" readOnly disabled /></label>
                    <label className="appraisal-field"><span>Employee ID</span><input value="" placeholder="Filled by Project Manager" readOnly disabled /></label>
                    <label className="appraisal-field"><span>Current Position</span><input value="" placeholder="Filled by Project Manager" readOnly disabled /></label>
                    <label className="appraisal-field"><span>Department</span><input value={selectedCycle.departmentNames?.join(', ') || 'All Departments'} readOnly disabled /></label>
                    <label className="appraisal-field"><span>Assessment Date</span><input value={displayDate(selectedCycle.startDate)} readOnly disabled /></label>
                    <label className="appraisal-field"><span>End Date</span><input value={displayDate(selectedCycle.endDate)} readOnly disabled /></label>
                  </div>
                </div>
                <div className="appraisal-form-block">
                  <h3>Evaluations</h3>
                  {selectedCycleTemplate.sections.map((section) => (
                    <div className="appraisal-section-card" key={section.id}>
                      <div className="appraisal-section-header"><div className="appraisal-section-title-wrap"><strong>{section.sectionName}</strong><small>{section.criteria.length} criteria</small></div></div>
                      <div className="appraisal-template-table-wrap">
                        <table className="appraisal-template-table">
                          <thead><tr><th>#</th><th>Criteria</th><th>Rating 1-5</th></tr></thead>
                          <tbody>
                            {section.criteria.map((criteria) => {
                              globalNo += 1;
                              return <tr key={criteria.id}><td className="appraisal-center-cell">{globalNo}</td><td>{criteria.criteriaText}</td><td><AppraisalRatingDots value={null} max={criteria.maxRating || 5} disabled /></td></tr>;
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="appraisal-form-block">
                  <h3>Score Calculation</h3>
                  <div className="appraisal-score-formula-card in-block">
                    <div className="appraisal-total-points-strip"><strong>Total Points</strong><span>Actual total points are shown after PM submits ratings.</span></div>
                    <table className="appraisal-score-formula-table">
                      <thead><tr><th>Analysis</th><th>Formula</th><th>Score</th></tr></thead>
                      <tbody><tr><td><strong>Total Points</strong></td><td><div className="formula-main">Total Point</div><div className="formula-divider" /><div>Number of Questions Answered × 5</div><div className="formula-multiply">× 100</div></td><td>Auto calculated from PM ratings</td></tr></tbody>
                    </table>
                  </div>
                </div>
                <div className="appraisal-form-block"><h3>Score Guide</h3>{renderScoreGuide(selectedCycleTemplate)}</div>
                <div className="appraisal-form-block">
                  <h3>Other Remarks</h3>
                  <div className="appraisal-other-remarks-preview"><span>Appraiser's Comment for Discussion</span></div>
                </div>
                {renderSignaturePreview(selectedCycleTemplate)}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderReuseModal = () => {
    if (!reuseSourceCycle) return null;
    let globalNo = 0;
    return (
      <div className="appraisal-modal-backdrop">
        <div className="appraisal-modal-box appraisal-modal-box-xl">
          <div className="appraisal-modal-header">
            <div><h2>{reuseMode === 'edit' ? 'Edit Draft Appraisal Cycle' : 'Re-use Appraisal Cycle'}</h2></div>
            <button className="appraisal-modal-close" type="button" onClick={closeReuseModal}><i className="bi bi-x-lg" /></button>
          </div>
          <div className="appraisal-modal-body template-form-modal-body">
            {reuseTemplateLoading && <div className="appraisal-empty">Loading cycle form...</div>}
            {!reuseTemplateLoading && reuseTemplateForm && (
              <>
                <div className="appraisal-form-block">
                  <h3>Cycle Setup</h3>
                  <div className="appraisal-inline-grid three">
                    <label className="appraisal-field">
                      <span>Cycle Year</span>
                      <input list="reuse-cycle-year-options" value={reuseYearText} onChange={(event) => setReuseCycleYear(event.target.value)} placeholder={String(currentYear)} />
                      <datalist id="reuse-cycle-year-options">{cycleYearOptions.map((year) => <option key={year} value={year} />)}</datalist>
                      
                    </label>
                    <label className="appraisal-field"><span>Appraisal Name</span><input value={reuseForm.cycleName} onChange={(event) => setReuseForm({ ...reuseForm, cycleName: event.target.value })} /></label>
                    <label className="appraisal-field"><span>Cycle Type</span><select value={reuseForm.cycleType} onChange={(event) => setReuseCycleType(event.target.value as AppraisalCycleType)}><option value="ANNUAL">Annual</option><option value="SEMI_ANNUAL">Semi-Annual</option><option value="CUSTOM">Custom</option></select></label>
                  </div>
                  <div className="appraisal-inline-grid three">
                    {renderDatePickerField({ label: 'Assessment Date', field: 'startDate', textValue: reuseForm.cycleType === 'ANNUAL' ? displayDate(reuseComputedDates.startDate) : reuseDateText.startDate, isoValue: reuseForm.cycleType === 'ANNUAL' ? reuseComputedDates.startDate : reuseForm.startDate, disabled: reuseForm.cycleType === 'ANNUAL', helper: reuseForm.cycleType === 'ANNUAL' ? 'System calculated from cycle year.' : 'Use DD/MM/YYYY or choose from calendar.', reuse: true })}
                    {renderDatePickerField({ label: 'End Date', field: 'endDate', textValue: reuseForm.cycleType === 'CUSTOM' ? reuseDateText.endDate : displayDate(reuseComputedDates.endDate), isoValue: reuseForm.cycleType === 'CUSTOM' ? reuseForm.endDate : reuseComputedDates.endDate, disabled: reuseForm.cycleType !== 'CUSTOM', helper: reuseForm.cycleType === 'CUSTOM' ? 'Use DD/MM/YYYY or choose from calendar.' : 'System calculated.', reuse: true })}
                    {renderDatePickerField({ label: 'Manager Deadline', field: 'managerSubmissionDeadline', textValue: reuseDateText.managerSubmissionDeadline, isoValue: reuseForm.managerSubmissionDeadline, reuse: true })}
                    {renderDatePickerField({ label: 'Dept Head Deadline', field: 'deptHeadSubmissionDeadline', textValue: reuseDateText.deptHeadSubmissionDeadline, isoValue: reuseForm.deptHeadSubmissionDeadline, reuse: true })}
                  </div>
                  <div className="appraisal-department-box">
                    <label className="appraisal-checkbox-line"><input type="checkbox" checked={reuseAllDepartments} onChange={(event) => { setReuseAllDepartments(event.target.checked); if (event.target.checked) setReuseForm((previous) => ({ ...previous, departmentIds: [] })); }} /><span>All Departments</span></label>
                    {!reuseAllDepartments && <div className="appraisal-pill-list department-select-list">{departments.map((department) => <label key={department.id} className="appraisal-pill selectable"><input type="checkbox" checked={reuseForm.departmentIds.includes(department.id)} onChange={() => toggleDepartment(department.id, true)} />{department.departmentName}</label>)}</div>}
                  </div>
                </div>
                <div className="appraisal-form-block">
                  <h3>Evaluations</h3>
                  {reuseTemplateForm.sections.map((section, sectionIndex) => (
                    <div className="appraisal-section-card" key={`reuse-section-${sectionIndex}`}>
                      <div className="appraisal-section-header">
                        <div className="appraisal-section-title-wrap"><input className="appraisal-section-title-input" value={section.sectionName} onChange={(event) => updateReuseSection(sectionIndex, { sectionName: event.target.value })} placeholder="Section name" /><small>{section.criteria.length} criteria</small></div>
                        <div className="appraisal-button-row compact"><button className="appraisal-button ghost" type="button" onClick={() => addReuseCriteria(sectionIndex)}>Add Row</button><button className="appraisal-button danger" type="button" onClick={() => removeReuseSection(sectionIndex)}>Delete Section</button></div>
                      </div>
                      <div className="appraisal-template-table-wrap">
                        <table className="appraisal-template-table">
                          <thead><tr><th>#</th><th>Criteria</th><th>Rating 1-5</th><th /></tr></thead>
                          <tbody>
                            {section.criteria.map((criteria, criteriaIndex) => {
                              globalNo += 1;
                              return <tr key={`reuse-criteria-${sectionIndex}-${criteriaIndex}`}><td className="appraisal-center-cell">{globalNo}</td><td><input value={criteria.criteriaText} onChange={(event) => updateReuseCriteria(sectionIndex, criteriaIndex, { criteriaText: event.target.value })} placeholder="Enter criteria" /></td><td><AppraisalRatingDots value={null} max={criteria.maxRating || 5} disabled /></td><td><button className="appraisal-button danger tiny" type="button" onClick={() => removeReuseCriteria(sectionIndex, criteriaIndex)}><i className="bi bi-trash" /></button></td></tr>;
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                  <button className="appraisal-button secondary appraisal-add-section-bottom" type="button" onClick={addReuseSection}>Add Section</button>
                </div>
<div className="appraisal-form-block"><h3>Score Ranges</h3>{renderReuseScoreEditor()}</div>
                <div className="appraisal-form-block"><h3>Other Remarks</h3><div className="appraisal-other-remarks-preview"><span>Appraiser's Comment for Discussion</span></div></div>
                {renderSignaturePreview(reuseTemplateForm)}
              </>
            )}
          </div>
          <div className="appraisal-modal-footer">
            <button className="appraisal-button secondary" type="button" onClick={closeReuseModal}>Cancel</button>
            <button className="appraisal-button primary" type="button" disabled={loading || reuseTemplateLoading} onClick={askReuseSubmit}>{reuseMode === 'edit' ? 'Save Cycle Changes' : 'Save Re-used Cycle'}</button>
          </div>
        </div>
      </div>
    );
  };

  const renderEditRecordsModal = () => {
    if (!editRecordsTitle) return null;
    return (
      <div className="appraisal-modal-backdrop" onMouseDown={closeEditRecords}>
        <div className="appraisal-modal-box appraisal-modal-box-xl appraisal-edit-records-modal" onMouseDown={(event) => event.stopPropagation()}>
          <div className="appraisal-modal-header">
            <div>
              <h2>Appraisal Cycle Edit Records</h2>
              <p>{editRecordsTitle}</p>
            </div>
            <button className="appraisal-modal-close" type="button" onClick={closeEditRecords}><i className="bi bi-x-lg" /></button>
          </div>
          <div className="appraisal-modal-body">
            {editRecordsLoading && <div className="appraisal-empty">Loading edit records...</div>}
            {!editRecordsLoading && editRecords.length === 0 && <div className="appraisal-empty">No edit records yet.</div>}
            {!editRecordsLoading && editRecords.length > 0 && (
              <div className="appraisal-edit-record-list">
                {editRecords.map((record) => (
                  <div className="appraisal-edit-record-card" key={record.id}>
                    <div className="appraisal-edit-record-card-head">
                      <div>
                        <strong>{record.changedByName || `User #${record.userId ?? '-'}`}</strong>
                        <span>{displayDateTime(record.timestamp)}</span>
                      </div>
                      <span className="appraisal-status status-active">{record.action}</span>
                    </div>
                    <div className="appraisal-edit-record-values">
                      <div><strong>Before</strong><p>{record.oldValue || '-'}</p></div>
                      <div><strong>After</strong><p>{record.newValue || '-'}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="appraisal-modal-footer">
            <button className="appraisal-button secondary" type="button" onClick={closeEditRecords}>Close</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="appraisal-page">
      <div className="appraisal-page-header">
        <div><h1>Appraisal Cycles</h1><p>Manage appraisal cycles created from reusable template forms.</p></div>
        <button className="appraisal-button primary" type="button" onClick={() => openCreateModal()}><i className="bi bi-plus-circle" />Create Appraisal Cycle</button>
      </div>

      <div className="appraisal-card">
        <div className="appraisal-form-block-header">
<div><h2>Appraisal Cycles</h2></div>
          <button className="appraisal-button secondary" type="button" disabled={loading} onClick={() => void loadData()}>Refresh</button>
        </div>
        <div className="appraisal-filter-bar appraisal-cycle-filter-bar">
          <label className="appraisal-filter-field">
            <span>Search Appraisal Name</span>
            <input value={cycleSearch} onChange={(event) => setCycleSearch(event.target.value)} placeholder="Search by appraisal name" />
          </label>
          <label className="appraisal-filter-field">
            <span>Template</span>
            <select value={cycleTemplateFilter} onChange={(event) => setCycleTemplateFilter(event.target.value)}>
              <option value="">All Templates</option>
              {cycleTemplateOptions.map(([templateId, templateName]) => <option key={templateId} value={templateId}>{templateName}</option>)}
            </select>
          </label>
          <label className="appraisal-filter-field">
            <span>Department</span>
            <select value={cycleDepartmentFilter} onChange={(event) => setCycleDepartmentFilter(event.target.value)}>
              <option value="">All Departments</option>
              {cycleDepartmentOptions.map(([departmentId, departmentName]) => <option key={departmentId} value={departmentId}>{departmentName}</option>)}
            </select>
          </label>
          <label className="appraisal-filter-field">
            <span>Cycle Type</span>
            <select value={cycleTypeFilter} onChange={(event) => setCycleTypeFilter(event.target.value)}>
              <option value="">All Cycle Types</option>
              <option value="ANNUAL">Annual</option>
              <option value="SEMI_ANNUAL">Semi-Annual</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </label>
          <label className="appraisal-filter-field">
            <span>Year</span>
            <select value={cycleYearFilter} onChange={(event) => setCycleYearFilter(event.target.value)}>
              <option value="">All Years</option>
              {cycleYearFilterOptions.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <div className="appraisal-filter-actions">
            <button className="appraisal-button ghost" type="button" onClick={clearCycleFilters}>Clear Filters</button>
            <span className="appraisal-filter-result">Showing {filteredCycles.length} of {cycles.length}</span>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="appraisal-table appraisal-cycle-record-table">
            <thead><tr><th>Appraisal Name</th><th>Template</th><th>Departments</th><th>Cycle Type</th><th>Cycle Year</th><th>Start Date</th><th>End Date</th><th>Manager Deadline</th><th>Dept Head Deadline</th><th>Created By</th><th>Created At</th><th>Status</th><th>Locked</th><th>Actions</th></tr></thead>
            <tbody>
              {cycles.length === 0 && <tr><td colSpan={14}><div className="appraisal-empty">No appraisal cycles yet.</div></td></tr>}
              {cycles.length > 0 && filteredCycles.length === 0 && <tr><td colSpan={14}><div className="appraisal-empty">No appraisal cycles match the selected search/filter.</div></td></tr>}
              {filteredCycles.map((cycle) => (
                <tr key={cycle.id}>
                  <td><strong>{cycle.cycleName}</strong></td><td>{cycle.templateName || '-'}</td><td>{cycle.departmentNames?.join(', ') || 'All Departments'}</td><td>{formatCycleType(cycle.cycleType)}</td><td>{cycle.cycleYear}</td><td>{displayDate(cycle.startDate)}</td><td>{displayDate(cycle.endDate)}</td><td>{displayDate(cycle.managerSubmissionDeadline || cycle.submissionDeadline)}</td><td>{displayDate(cycle.deptHeadSubmissionDeadline || cycle.submissionDeadline)}</td><td>{cycle.createdByEmployeeId || '-'}</td><td>{displayDateTime(cycle.createdAt)}</td><td><span className={`appraisal-status ${statusClass(cycle.status)}`}>{cycle.status}</span></td><td>{cycle.locked ? 'Yes' : 'No'}</td>
                  <td><div className="appraisal-button-row record-actions"><button className="appraisal-button ghost" type="button" onClick={() => void openCycleView(cycle)}>View Cycle</button>{cycle.status === 'DRAFT' && <button className="appraisal-button secondary" type="button" onClick={() => void openEditCycle(cycle)}>Edit</button>}{cycle.status === 'DRAFT' && <button className="appraisal-button success" type="button" onClick={() => askActivateCycle(cycle)}>Active</button>}{cycle.status === 'ACTIVE' && <button className="appraisal-button warning" type="button" onClick={() => runAction(() => appraisalCycleService.lock(cycle.id), 'Cycle locked.')}>Lock</button>}{cycle.status !== 'COMPLETED' && <button className="appraisal-button secondary" type="button" disabled={!canCompleteCycle(cycle)} title={canCompleteCycle(cycle) ? 'Complete this locked cycle' : 'Cycle must be locked first'} onClick={() => runAction(() => appraisalCycleService.complete(cycle.id), 'Cycle completed.')}>Complete</button>}<button className="appraisal-button ghost" type="button" onClick={() => void openEditRecords(cycle)}>Edit Records</button><button className="appraisal-button ghost" type="button" onClick={() => void openReuseModal(cycle)}>Re-use</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {renderCycleFormPreview()}
      {renderReuseModal()}
      {renderEditRecordsModal()}
      {renderPopup()}

      {showCreateModal && (
        <div className="appraisal-modal-backdrop">
          <div className="appraisal-modal-box">
            <div className="appraisal-modal-header"><div><h2>Create Appraisal Cycle</h2><p>Set cycle year first, then choose template, period, and target departments.</p></div><button className="appraisal-modal-close" type="button" onClick={closeCreateModal}><i className="bi bi-x-lg" /></button></div>
            <div className="appraisal-modal-body">
              <div className="appraisal-inline-grid three">
                <label className="appraisal-field"><span>Cycle Year</span><input list="cycle-year-options" value={cycleYearText} onChange={(event) => setCycleYear(event.target.value)} placeholder={String(currentYear)} /><datalist id="cycle-year-options">{cycleYearOptions.map((year) => <option key={year} value={year} />)}</datalist></label>
                <label className="appraisal-field"><span>Appraisal Name</span><input value={cycleForm.cycleName} onChange={(event) => setCycleForm({ ...cycleForm, cycleName: event.target.value })} placeholder="Enter appraisal name" /></label>
                <label className="appraisal-field"><span>Cycle Type</span><select value={cycleForm.cycleType} onChange={(event) => setCycleType(event.target.value as AppraisalCycleType)}><option value="ANNUAL">Annual</option><option value="SEMI_ANNUAL">Semi-Annual</option><option value="CUSTOM">Custom</option></select></label>
              </div>
              <div className="appraisal-inline-grid three">
                <label className="appraisal-field"><span>Template Form</span><select value={cycleForm.templateId} onChange={(event) => setCycleForm({ ...cycleForm, templateId: Number(event.target.value) })}><option value={0}>Select template form record</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.templateName}</option>)}</select></label>
                {renderDatePickerField({ label: 'Start Date', field: 'startDate', textValue: cycleForm.cycleType === 'ANNUAL' ? displayDate(computedDates.startDate) : dateText.startDate, isoValue: cycleForm.cycleType === 'ANNUAL' ? computedDates.startDate : cycleForm.startDate, disabled: cycleForm.cycleType === 'ANNUAL', helper: cycleForm.cycleType === 'ANNUAL' ? 'System calculated from cycle year.' : 'Use DD/MM/YYYY or choose from calendar.' })}
                {renderDatePickerField({ label: 'End Date', field: 'endDate', textValue: cycleForm.cycleType === 'CUSTOM' ? dateText.endDate : displayDate(computedDates.endDate), isoValue: cycleForm.cycleType === 'CUSTOM' ? cycleForm.endDate : computedDates.endDate, disabled: cycleForm.cycleType !== 'CUSTOM', helper: cycleForm.cycleType === 'CUSTOM' ? 'Use DD/MM/YYYY or choose from calendar.' : 'System calculated.' })}
                {renderDatePickerField({ label: 'Manager Deadline', field: 'managerSubmissionDeadline', textValue: dateText.managerSubmissionDeadline, isoValue: cycleForm.managerSubmissionDeadline })}
                {renderDatePickerField({ label: 'Dept Head Deadline', field: 'deptHeadSubmissionDeadline', textValue: dateText.deptHeadSubmissionDeadline, isoValue: cycleForm.deptHeadSubmissionDeadline })}
              </div>
              <div className="appraisal-department-box">
                <label className="appraisal-checkbox-line"><input type="checkbox" checked={targetAllDepartments} onChange={(event) => { setTargetAllDepartments(event.target.checked); if (event.target.checked) setCycleForm((previous) => ({ ...previous, departmentIds: [] })); }} /><span>All Departments</span></label>
                {!targetAllDepartments && <div className="appraisal-pill-list department-select-list">{departments.map((department) => <label key={department.id} className="appraisal-pill selectable"><input type="checkbox" checked={cycleForm.departmentIds.includes(department.id)} onChange={() => toggleDepartment(department.id)} />{department.departmentName}</label>)}</div>}
              </div>
            </div>
            <div className="appraisal-modal-footer"><button className="appraisal-button secondary" type="button" onClick={closeCreateModal}>Cancel</button><button className="appraisal-button primary" type="button" disabled={loading} onClick={() => void createCycle()}>Create Appraisal Cycle</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppraisalCyclesPage;
