import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { appraisalAuditService, appraisalTemplateService, type AppraisalAuditLog } from '../../services/appraisalService';
import { signatureService } from '../../services/signatureService';
import { extractApiErrorMessage } from '../../services/apiError';
import type {
  AppraisalCriterionRequest,
  AppraisalScoreBandRequest,
  AppraisalSectionRequest,
  AppraisalTemplateRequest,
  AppraisalTemplateResponse,
} from '../../types/appraisal';
import type { Signature } from '../../types/signature';
import AppraisalRatingDots from '../../components/appraisal/AppraisalRatingDots';
import './appraisal.css';

type TemplateModalMode = 'create' | 'edit' | 'view' | null;

type TemplateRecordLocationState = {
  message?: string;
  templateId?: number;
};

type PopupState = {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  onOk?: () => void | Promise<void>;
};


type ScoreBandLike = {
  minScore: number;
  maxScore: number;
  label: string;
  description?: string;
  sortOrder: number;
  active: boolean;
};

const defaultScoreBands = (): AppraisalScoreBandRequest[] => [
  { minScore: 86, maxScore: 100, label: 'Outstanding', description: 'Performance exceptional and far exceeds expectations.', sortOrder: 1, active: true },
  { minScore: 71, maxScore: 85, label: 'Exceeds Requirements', description: 'Performance is consistent and clearly meets essential requirements.', sortOrder: 2, active: true },
  { minScore: 60, maxScore: 70, label: 'Meet Requirement', description: 'Performance is satisfactory and meets requirements of the job.', sortOrder: 3, active: true },
  { minScore: 40, maxScore: 59, label: 'Need Improvement', description: 'Performance is inconsistent. Supervision and training are needed.', sortOrder: 4, active: true },
  { minScore: 0, maxScore: 39, label: 'Unsatisfactory', description: 'Performance does not meet the minimum requirement of the job.', sortOrder: 5, active: true },
];


const clampScore = (value: number) => Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

const uniqueScoreBands = <T extends ScoreBandLike>(bands: T[]) => {
  const unique = new Map<string, T>();
  for (const band of bands) {
    const key = `${band.minScore}-${band.maxScore}-${band.label.trim().toLowerCase()}`;
    if (!unique.has(key)) {
      unique.set(key, band);
    }
  }
  return Array.from(unique.values()).sort((a, b) => a.sortOrder - b.sortOrder);
};

const makeCriteria = (criteriaText: string, sortOrder: number): AppraisalCriterionRequest => ({
  criteriaText,
  description: '',
  sortOrder,
  maxRating: 5,
  ratingRequired: true,
  active: true,
});

const emptyTemplate = (): AppraisalTemplateRequest => ({
  templateName: '',
  description: '',
  appraiseeSignatureId: null,
  appraiserSignatureId: null,
  hrSignatureId: null,
  signatureDateFormat: 'DD/MM/YYYY',
  formType: 'ANNUAL',
  targetAllDepartments: true,
  departmentIds: [],
  sections: [],
  scoreBands: defaultScoreBands(),
});


const signatureDateFormats: Array<'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'> = [
  'DD/MM/YYYY',
  'MM/DD/YYYY',
  'YYYY-MM-DD',
];

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

const displayDateTime = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(parsed);
  }
  return value;
};

type SignatureDisplayBlockProps = {
  label: string;
  signature?: Signature;
  dateText: string;
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

const toEditableForm = (template: AppraisalTemplateResponse): AppraisalTemplateRequest => ({
  templateName: template.templateName,
  description: template.description ?? '',
  appraiseeSignatureId: template.appraiseeSignatureId ?? null,
  appraiserSignatureId: template.appraiserSignatureId ?? null,
  hrSignatureId: template.hrSignatureId ?? null,
  signatureDateFormat: template.signatureDateFormat ?? 'DD/MM/YYYY',
  formType: template.formType ?? 'ANNUAL',
  targetAllDepartments: true,
  departmentIds: [],
  sections: template.sections.map((section, sectionIndex) => ({
    id: section.id,
    sectionName: section.sectionName,
    description: section.description ?? '',
    sortOrder: section.sortOrder ?? sectionIndex + 1,
    active: section.active ?? true,
    criteria: section.criteria.map((criteria, criteriaIndex) => ({
      id: criteria.id,
      criteriaText: criteria.criteriaText,
      description: '',
      sortOrder: criteria.sortOrder ?? criteriaIndex + 1,
      maxRating: criteria.maxRating || 5,
      ratingRequired: criteria.ratingRequired ?? true,
      active: criteria.active ?? true,
    })),
  })),
  scoreBands: uniqueScoreBands(template.scoreBands?.length ? template.scoreBands : defaultScoreBands()).map((band, index) => ({
    id: band.id,
    minScore: band.minScore,
    maxScore: band.maxScore,
    label: band.label,
    description: band.description ?? '',
    sortOrder: band.sortOrder ?? index + 1,
    active: band.active ?? true,
  })),
});

const normalizeForm = (form: AppraisalTemplateRequest): AppraisalTemplateRequest => ({
  templateName: form.templateName.trim(),
  description: form.description?.trim() ?? '',
  appraiseeSignatureId: form.appraiseeSignatureId ?? null,
  appraiserSignatureId: form.appraiserSignatureId ?? null,
  hrSignatureId: form.hrSignatureId ?? null,
  signatureDateFormat: form.signatureDateFormat ?? 'DD/MM/YYYY',
  formType: 'ANNUAL',
  targetAllDepartments: true,
  departmentIds: [],
  sections: form.sections.map((section, sectionIndex) => ({
    ...section,
    sectionName: section.sectionName.trim(),
    description: section.description?.trim() ?? '',
    sortOrder: sectionIndex + 1,
    active: true,
    criteria: section.criteria.map((criteria, criteriaIndex) => ({
      ...criteria,
      criteriaText: criteria.criteriaText.trim(),
      description: '',
      sortOrder: criteriaIndex + 1,
      maxRating: criteria.maxRating || 5,
      ratingRequired: true,
      active: true,
    })),
  })),
  scoreBands: uniqueScoreBands(form.scoreBands?.length ? form.scoreBands : defaultScoreBands()).map((band, index) => ({
    ...band,
    minScore: clampScore(Number(band.minScore)),
    maxScore: clampScore(Number(band.maxScore)),
    label: band.label,
    description: band.description ?? '',
    sortOrder: index + 1,
    active: true,
  })),
});

const AppraisalTemplateRecordsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const routeState = location.state as TemplateRecordLocationState | null;
  const [templates, setTemplates] = useState<AppraisalTemplateResponse[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<AppraisalTemplateResponse | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<AppraisalTemplateResponse | null>(null);
  const [form, setForm] = useState<AppraisalTemplateRequest>(() => emptyTemplate());
  const [modalMode, setModalMode] = useState<TemplateModalMode>(null);
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [signatureLoading, setSignatureLoading] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateYearFilter, setTemplateYearFilter] = useState('');
  const [editRecordsTitle, setEditRecordsTitle] = useState('');
  const [editRecords, setEditRecords] = useState<AppraisalAuditLog[]>([]);
  const [editRecordsLoading, setEditRecordsLoading] = useState(false);

  const formTotalCriteria = useMemo(() => form.sections.reduce((sum, section) => sum + section.criteria.length, 0), [form.sections]);
  const signatureById = useMemo(() => {
    const map = new Map<number, Signature>();
    signatures.forEach((item) => map.set(item.id, item));
    return map;
  }, [signatures]);

  const templateYearOptions = useMemo(() => {
    const years = new Set<number>();
    templates.forEach((template) => {
      if (!template.createdAt) return;
      const year = new Date(template.createdAt).getFullYear();
      if (!Number.isNaN(year)) years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const searchText = templateSearch.trim().toLowerCase();
    const selectedYear = templateYearFilter ? Number(templateYearFilter) : null;
    return templates.filter((template) => {
      const nameMatches = !searchText || template.templateName.toLowerCase().includes(searchText);
      const createdYear = template.createdAt ? new Date(template.createdAt).getFullYear() : null;
      const yearMatches = selectedYear === null || createdYear === selectedYear;
      return nameMatches && yearMatches;
    });
  }, [templateSearch, templateYearFilter, templates]);

  const clearTemplateFilters = () => {
    setTemplateSearch('');
    setTemplateYearFilter('');
  };

  const setAlert = (text: string, type: 'success' | 'error' | 'info' = 'info', onOk?: () => void | Promise<void>) => {
    setPopup({
      title: type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Notice',
      message: text,
      type,
      onOk,
    });
  };

  const handlePopupOk = () => {
    const handler = popup?.onOk;
    setPopup(null);
    if (handler) void handler();
  };

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const templateList = await appraisalTemplateService.list();
      setTemplates(templateList);
    } catch (error) {
      setAlert(error instanceof Error ? error.message : 'Template forms load failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeState?.message) {
      setAlert(routeState.message, 'success');
      window.history.replaceState({}, document.title);
    }
    void loadTemplates();
  }, []);


  useEffect(() => {
    const loadSignatures = async () => {
      try {
        setSignatureLoading(true);
        const data = await signatureService.list();
        setSignatures(data);
      } catch {
        setSignatures([]);
      } finally {
        setSignatureLoading(false);
      }
    };
    void loadSignatures();
  }, []);

  useEffect(() => {
    if (searchParams.get('openCreate') === '1') {
      openCreate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const closeModal = () => {
    setModalMode(null);
    setSelectedTemplate(null);
    setEditingTemplate(null);
    setForm(emptyTemplate());
    setSearchParams({});
  };

  const openCreate = () => {
    setForm(emptyTemplate());
    setSelectedTemplate(null);
    setEditingTemplate(null);
    setModalMode('create');
  };

  const openView = async (templateId: number) => {
    setLoading(true);
    try {
      const template = await appraisalTemplateService.get(templateId);
      setSelectedTemplate(template);
      setEditingTemplate(null);
      setModalMode('view');
    } catch (error) {
      setAlert(error instanceof Error ? error.message : 'Template form load failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = async (templateId: number) => {
    setLoading(true);
    try {
      const template = await appraisalTemplateService.get(templateId);
      setEditingTemplate(template);
      setSelectedTemplate(null);
      setForm(toEditableForm(template));
      setModalMode('edit');
    } catch (error) {
      setAlert(error instanceof Error ? error.message : 'Template form load failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openEditRecords = async (template: AppraisalTemplateResponse) => {
    setEditRecordsTitle(template.templateName);
    setEditRecords([]);
    setEditRecordsLoading(true);
    try {
      const records = await appraisalAuditService.list('APPRAISAL_TEMPLATE', template.id);
      setEditRecords(records);
    } catch (error) {
      setAlert(extractApiErrorMessage(error, 'Edit records could not be loaded.'), 'error');
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

  const useThisTemplate = (templateId: number) => {
    navigate(`/hr/appraisal/cycles?templateId=${templateId}&openCreate=1`);
  };

  const validateTemplateForm = () => {
    if (!form.templateName.trim()) return 'Template name is required.';
    if (!form.description?.trim()) return 'Description is required.';
    if (!form.sections.length || formTotalCriteria === 0) return 'At least one section and one criteria are required.';
    for (const section of form.sections) {
      if (!section.sectionName.trim()) return 'Section name is required.';
      if (!section.criteria.length) return `At least one criteria is required in ${section.sectionName || 'each section'}.`;
      for (const criteria of section.criteria) {
        if (!criteria.criteriaText.trim()) return 'Criteria text is required.';
      }
    }
    const bands = uniqueScoreBands(form.scoreBands?.length ? form.scoreBands : defaultScoreBands());
    for (const band of bands) {
      if (Number.isNaN(Number(band.minScore)) || Number.isNaN(Number(band.maxScore))) return 'Score range values must be numbers.';
      if (Number(band.minScore) < 0 || Number(band.maxScore) > 100 || Number(band.minScore) > Number(band.maxScore)) {
        return 'Score ranges must be valid values between 0 and 100.';
      }
    }
    return '';
  };

  const createTemplate = async () => {
    const validationMessage = validateTemplateForm();
    if (validationMessage) {
      setAlert(validationMessage, 'error');
      return;
    }
    setLoading(true);
    try {
      const created = await appraisalTemplateService.create(normalizeForm(form));
      setAlert(`Template form "${created.templateName}" created successfully.`, 'success', async () => {
        closeModal();
        await loadTemplates();
      });
    } catch (error) {
      setAlert(extractApiErrorMessage(error, 'Form template create failed.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!editingTemplate) return;
    const validationMessage = validateTemplateForm();
    if (validationMessage) {
      setAlert(validationMessage, 'error');
      return;
    }
    setLoading(true);
    try {
      const updated = await appraisalTemplateService.updateDraft(editingTemplate.id, normalizeForm(form));
      setAlert(`Template form "${updated.templateName}" updated successfully.`, 'success', async () => {
        closeModal();
        await loadTemplates();
      });
    } catch (error) {
      setAlert(extractApiErrorMessage(error, 'Template update failed.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateSection = (sectionIndex: number, patch: Partial<AppraisalSectionRequest>) => {
    setForm((previous) => ({
      ...previous,
      sections: previous.sections.map((section, index) => (index === sectionIndex ? { ...section, ...patch } : section)),
    }));
  };

  const updateCriterion = (sectionIndex: number, criteriaIndex: number, patch: Partial<AppraisalCriterionRequest>) => {
    setForm((previous) => ({
      ...previous,
      sections: previous.sections.map((section, index) => {
        if (index !== sectionIndex) return section;
        return {
          ...section,
          criteria: section.criteria.map((criteria, innerIndex) => (innerIndex === criteriaIndex ? { ...criteria, ...patch } : criteria)),
        };
      }),
    }));
  };

  const addSection = () => {
    setForm((previous) => ({
      ...previous,
      sections: [
        ...previous.sections,
        {
          sectionName: '',
          description: '',
          sortOrder: previous.sections.length + 1,
          active: true,
          criteria: [],
        },
      ],
    }));
  };

  const removeSection = (sectionIndex: number) => {
    setForm((previous) => ({ ...previous, sections: previous.sections.filter((_, index) => index !== sectionIndex) }));
  };

  const addCriteria = (sectionIndex: number) => {
    setForm((previous) => ({
      ...previous,
      sections: previous.sections.map((section, index) => {
        if (index !== sectionIndex) return section;
        return { ...section, criteria: [...section.criteria, makeCriteria('', section.criteria.length + 1)] };
      }),
    }));
  };

  const removeCriteria = (sectionIndex: number, criteriaIndex: number) => {
    setForm((previous) => ({
      ...previous,
      sections: previous.sections.map((section, index) => {
        if (index !== sectionIndex) return section;
        return { ...section, criteria: section.criteria.filter((_, innerIndex) => innerIndex !== criteriaIndex) };
      }),
    }));
  };

  const updateScoreBand = (bandIndex: number, patch: Partial<AppraisalScoreBandRequest>) => {
    setForm((previous) => ({
      ...previous,
      scoreBands: uniqueScoreBands(previous.scoreBands?.length ? previous.scoreBands : defaultScoreBands()).map((band, index) => (
        index === bandIndex ? { ...band, ...patch } : band
      )),
    }));
  };

  const renderScoreBandEditor = (bands: AppraisalScoreBandRequest[], readOnly = false) => (
    <div className="appraisal-score-band-editor">
      <div className="appraisal-score-band-head">
        <span>Score</span>
        <span>Rating</span>
        <span>Explanation</span>
      </div>
      {bands.map((band, index) => (
        <div className="appraisal-score-band-row" key={`${band.label}-${index}`}>
          <div className="appraisal-score-range-inputs">
            {readOnly ? (
              <strong>{String(band.minScore).padStart(2, '0')}-{band.maxScore}</strong>
            ) : (
              <>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={band.minScore}
                  onChange={(event) => updateScoreBand(index, { minScore: clampScore(Number(event.target.value)) })}
                />
                <span>-</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={band.maxScore}
                  onChange={(event) => updateScoreBand(index, { maxScore: clampScore(Number(event.target.value)) })}
                />
              </>
            )}
          </div>
          <strong>{band.label}</strong>
          <span className="appraisal-muted">{band.description}</span>
        </div>
      ))}
    </div>
  );



  const renderTemplateSignatureSection = (readOnly = false) => {
    const appraiseeSignature = form.appraiseeSignatureId ? signatureById.get(form.appraiseeSignatureId) : undefined;
    const appraiserSignature = form.appraiserSignatureId ? signatureById.get(form.appraiserSignatureId) : undefined;
    const hrSignature = form.hrSignatureId ? signatureById.get(form.hrSignatureId) : undefined;
    const dateFormat = form.signatureDateFormat ?? 'DD/MM/YYYY';
    const dateText = formatDateByPattern(new Date(), dateFormat);

    return (
      <div className="appraisal-form-block">
        <h3>Signature Section</h3>
        {!readOnly && (
          <div className="appraisal-inline-grid two appraisal-signature-controls">
            <label className="appraisal-field">
              <span>Appraisee Signature</span>
              <select
                value={form.appraiseeSignatureId ?? ''}
                onChange={(event) => setForm({ ...form, appraiseeSignatureId: event.target.value ? Number(event.target.value) : null })}
                disabled
              >
                <option value="">{signatureLoading ? 'Loading signatures...' : 'Select signature'}</option>
                {signatures.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <label className="appraisal-field">
              <span>Appraiser Signature</span>
              <select
                value={form.appraiserSignatureId ?? ''}
                onChange={(event) => setForm({ ...form, appraiserSignatureId: event.target.value ? Number(event.target.value) : null })}
                disabled
              >
                <option value="">{signatureLoading ? 'Loading signatures...' : 'Select signature'}</option>
                {signatures.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <label className="appraisal-field">
              <span>HR Signature</span>
              <select
                value={form.hrSignatureId ?? ''}
                onChange={(event) => setForm({ ...form, hrSignatureId: event.target.value ? Number(event.target.value) : null })}
                disabled
              >
                <option value="">{signatureLoading ? 'Loading signatures...' : 'Select signature'}</option>
                {signatures.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <label className="appraisal-field">
              <span>Date Format</span>
              <select
                value={dateFormat}
                onChange={(event) => setForm({ ...form, signatureDateFormat: event.target.value as AppraisalTemplateRequest['signatureDateFormat'] })}
                disabled
              >
                {signatureDateFormats.map((format) => (
                  <option key={format} value={format}>{format}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        <div className="appraisal-signature-grid appraisal-template-signature-grid">
          <SignatureDisplayBlock label="Signature of Appraisee & Date" signature={appraiseeSignature} dateText={dateText} />
          <SignatureDisplayBlock label="Signature of Appraiser & Date" signature={appraiserSignature} dateText={dateText} />
          <SignatureDisplayBlock label="HR Signature / Date / Designation" signature={hrSignature} dateText={dateText} />
        </div>
      </div>
    );
  };

  const renderTemplateSignaturePreview = () => {
    if (!selectedTemplate) return null;
    const dateFormat = selectedTemplate.signatureDateFormat ?? 'DD/MM/YYYY';
    const dateText = formatDateByPattern(new Date(), dateFormat);
    return (
      <div className="appraisal-form-block">
        <h3>Signature Section</h3>
        <div className="appraisal-signature-grid appraisal-template-signature-grid">
          <SignatureDisplayBlock
            label="Signature of Appraisee & Date"
            signature={selectedTemplate.appraiseeSignatureId ? signatureById.get(selectedTemplate.appraiseeSignatureId) : undefined}
            dateText={dateText}
          />
          <SignatureDisplayBlock
            label="Signature of Appraiser & Date"
            signature={selectedTemplate.appraiserSignatureId ? signatureById.get(selectedTemplate.appraiserSignatureId) : undefined}
            dateText={dateText}
          />
          <SignatureDisplayBlock
            label="HR Signature / Date / Designation"
            signature={selectedTemplate.hrSignatureId ? signatureById.get(selectedTemplate.hrSignatureId) : undefined}
            dateText={dateText}
          />
        </div>
      </div>
    );
  };

  const renderTemplateEditor = () => {
    let globalNo = 0;
    return (
      <>
        <div className="appraisal-form-block">
          <h3>Template Setup</h3>
          <div className="appraisal-inline-grid two">
            <label className="appraisal-field">
              <span>Template Name <b className="appraisal-required">*</b></span>
              <input value={form.templateName} onChange={(event) => setForm({ ...form, templateName: event.target.value })} placeholder="Enter template name" />
            </label>
            <label className="appraisal-field">
              <span>Description <b className="appraisal-required">*</b></span>
              <input value={form.description ?? ''} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Enter template purpose" />
            </label>
          </div>
        </div>

        <div className="appraisal-form-block">
          <div className="appraisal-form-block-header">
            <div>
              <h3>Evaluations</h3>
            </div>
          </div>

          {form.sections.map((section, sectionIndex) => (
            <div className="appraisal-section-card" key={`section-${sectionIndex}`}>
              <div className="appraisal-section-header">
                <div className="appraisal-section-title-wrap">
                  <input
                    className="appraisal-section-title-input"
                    value={section.sectionName}
                    onChange={(event) => updateSection(sectionIndex, { sectionName: event.target.value })}
                    placeholder="Section name"
                  />
                  <small>{section.criteria.length} criteria</small>
                </div>
                <div className="appraisal-button-row compact">
                  <button className="appraisal-button ghost" type="button" onClick={() => addCriteria(sectionIndex)}>Add Row</button>
                  <button className="appraisal-button danger" type="button" onClick={() => removeSection(sectionIndex)}>Delete Section</button>
                </div>
              </div>
              <div className="appraisal-template-table-wrap">
                <table className="appraisal-template-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Criteria <b className="appraisal-required">*</b></th>
                      <th>Rating 1-5</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.criteria.map((criteria, criteriaIndex) => {
                      globalNo += 1;
                      return (
                        <tr key={`criteria-${sectionIndex}-${criteriaIndex}`}>
                          <td className="appraisal-center-cell">{globalNo}</td>
                          <td>
                            <input value={criteria.criteriaText} onChange={(event) => updateCriterion(sectionIndex, criteriaIndex, { criteriaText: event.target.value })} placeholder="Enter criteria" />
                          </td>
                          <td><AppraisalRatingDots value={null} max={criteria.maxRating || 5} disabled /></td>
                          <td className="appraisal-center-cell">
                            <button className="appraisal-button danger tiny" type="button" onClick={() => removeCriteria(sectionIndex, criteriaIndex)}>X</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <button className="appraisal-button secondary appraisal-add-section-bottom" type="button" onClick={addSection}>Add Section</button>
        </div>

        <div className="appraisal-form-block">
          <h3>Score Calculation</h3>
          <div className="appraisal-score-formula-card in-block">
            <div className="appraisal-total-points-strip">
              <strong>Total Points</strong>
              <span>Auto-filled after PM submits rating points.</span>
            </div>
            <table className="appraisal-score-formula-table">
              <thead>
                <tr>
                  <th>Analysis</th>
                  <th>Formula</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Total Points</strong></td>
                  <td>
                    <div className="formula-main">Total Point</div>
                    <div className="formula-divider" />
                    <div>Number of Questions Answered × 5</div>
                    <div className="formula-multiply">× 100</div>
                  </td>
                  <td>Auto calculated from PM ratings</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="appraisal-form-block">
          <h3>Score Guide</h3>
          {renderScoreBandEditor(uniqueScoreBands(form.scoreBands?.length ? form.scoreBands : defaultScoreBands()))}
        </div>

        <div className="appraisal-form-block">
          <h3>Other Remarks</h3>
          <textarea
            className="appraisal-other-remarks-textarea"
            rows={4}
            value=""
            placeholder="Appraiser's Comment for Discussion"
            readOnly
            disabled
          />
        </div>

        {renderTemplateSignatureSection()}
      </>
    );
  };

  const renderTemplatePreview = () => {
    if (!selectedTemplate) return null;
    let globalNo = 0;
    const bands = uniqueScoreBands(selectedTemplate.scoreBands?.length ? selectedTemplate.scoreBands : defaultScoreBands());
    return (
      <>
        <div className="appraisal-template-summary-card">
          <div><strong>Template Name</strong><span>{selectedTemplate.templateName}</span></div>
          <div><strong>Description</strong><span>{selectedTemplate.description || '-'}</span></div>
          <div><strong>Created At</strong><span>{displayDateTime(selectedTemplate.createdAt)}</span></div>
        </div>

        <div className="appraisal-form-block">
          <h3>Evaluations</h3>
          {selectedTemplate.sections.map((section) => (
            <div className="appraisal-section-card" key={section.id}>
              <div className="appraisal-section-header">
                <div className="appraisal-section-title-wrap">
                  <strong>{section.sectionName}</strong>
                  <small>{section.criteria.length} criteria</small>
                </div>
              </div>
              <div className="appraisal-template-table-wrap">
                <table className="appraisal-template-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Criteria</th>
                      <th>Rating 1-5</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.criteria.map((criteria) => {
                      globalNo += 1;
                      return (
                        <tr key={criteria.id}>
                          <td className="appraisal-center-cell">{globalNo}</td>
                          <td>{criteria.criteriaText}</td>
                          <td><AppraisalRatingDots value={null} max={criteria.maxRating || 5} disabled /></td>
                        </tr>
                      );
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
            <div className="appraisal-total-points-strip">
              <strong>Total Points</strong>
              <span>Actual total points are shown after PM submits ratings.</span>
            </div>
            <table className="appraisal-score-formula-table">
              <thead>
                <tr>
                  <th>Analysis</th>
                  <th>Formula</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Total Points</strong></td>
                  <td>
                    <div className="formula-main">Total Point</div>
                    <div className="formula-divider" />
                    <div>Number of Questions Answered × 5</div>
                    <div className="formula-multiply">× 100</div>
                  </td>
                  <td>Auto calculated from PM ratings</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="appraisal-form-block">
          <h3>Score Guide</h3>
          {renderScoreBandEditor(bands, true)}
        </div>

        <div className="appraisal-form-block">
          <h3>Other Remarks</h3>
          <div className="appraisal-other-remarks-preview">
            <span>Appraiser's Comment for Discussion</span>
          </div>
        </div>

        {renderTemplateSignaturePreview()}
      </>
    );
  };

  const renderEditRecordsModal = () => {
    if (!editRecordsTitle) return null;
    return (
      <div className="appraisal-modal-backdrop" onMouseDown={closeEditRecords}>
        <div className="appraisal-modal-box appraisal-modal-box-xl appraisal-edit-records-modal" onMouseDown={(event) => event.stopPropagation()}>
          <div className="appraisal-modal-header">
            <div>
              <h2>Template Edit Records</h2>
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
    <div className="appraisal-page appraisal-template-records-page">
      <div className="appraisal-page-header">
        <div>
          <h1>Template Forms</h1>
          <p>Create, view, and edit reusable blank appraisal form templates. Any appraisal cycle can use any template form.</p>
        </div>
        <div className="appraisal-button-row" style={{ marginTop: 0 }}>
          <button className="appraisal-button secondary" type="button" disabled={loading} onClick={() => void loadTemplates()}>Refresh</button>
          <button className="appraisal-button primary" type="button" onClick={openCreate}>Create New Template</button>
        </div>
      </div>

      <div className="appraisal-card">
        <div className="appraisal-form-block-header">
          <div>
            <h2>Template Forms</h2>
          </div>
        </div>
        <div className="appraisal-filter-bar">
          <label className="appraisal-filter-field">
            <span>Search Template Name</span>
            <input
              value={templateSearch}
              onChange={(event) => setTemplateSearch(event.target.value)}
              placeholder="Search by template name"
            />
          </label>
          <label className="appraisal-filter-field">
            <span>Year</span>
            <select value={templateYearFilter} onChange={(event) => setTemplateYearFilter(event.target.value)}>
              <option value="">All Years</option>
              {templateYearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <div className="appraisal-filter-actions">
            <button className="appraisal-button ghost" type="button" onClick={clearTemplateFilters}>Clear Filters</button>
            <span className="appraisal-filter-result">Showing {filteredTemplates.length} of {templates.length}</span>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="appraisal-table appraisal-cycle-record-table">
            <thead>
              <tr>
                <th>Template Name</th>
                <th>Description</th>
                <th>Sections</th>
                <th>Criteria</th>
                <th>Created By</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 && (
                <tr><td colSpan={7}><div className="appraisal-empty">No template forms yet.</div></td></tr>
              )}
              {templates.length > 0 && filteredTemplates.length === 0 && (
                <tr><td colSpan={7}><div className="appraisal-empty">No template forms match the selected search/filter.</div></td></tr>
              )}
              {filteredTemplates.map((template) => {
                const criteriaCount = template.sections.reduce((sum, section) => sum + section.criteria.length, 0);
                return (
                  <tr key={template.id}>
                    <td><strong>{template.templateName}</strong></td>
                    <td>{template.description || '-'}</td>
                    <td>{template.sections.length}</td>
                    <td>{criteriaCount}</td>
                    <td>{template.createdByEmployeeId || '-'}</td>
                    <td>{displayDateTime(template.createdAt)}</td>
                    <td>
                      <div className="appraisal-button-row record-actions">
                        <button className="appraisal-button ghost" type="button" onClick={() => void openView(template.id)}>View Form</button>
                        <button className="appraisal-button secondary" type="button" onClick={() => void openEdit(template.id)}>Edit</button>
                        <button className="appraisal-button ghost" type="button" onClick={() => void openEditRecords(template)}>Edit Records</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>


      {renderEditRecordsModal()}

      {popup && (
        <div className="appraisal-popup-backdrop">
          <div className={`appraisal-popup-box ${popup.type ?? 'info'}`}>
            <div className="appraisal-popup-icon"><i className={`bi ${popup.type === 'success' ? 'bi-check-circle' : popup.type === 'error' ? 'bi-exclamation-circle' : 'bi-info-circle'}`} /></div>
            <h3>{popup.title}</h3>
            <p>{popup.message}</p>
            <div className="appraisal-popup-actions">
              <button className="appraisal-button primary" type="button" onClick={handlePopupOk}>Okay</button>
            </div>
          </div>
        </div>
      )}

      {modalMode && (
        <div className="appraisal-modal-backdrop">
          <div className="appraisal-modal-box appraisal-modal-box-xl">
            <div className="appraisal-modal-header">
              <div>
                <h2>{modalMode === 'create' ? 'Create New Template' : modalMode === 'edit' ? 'Edit Template Form' : 'View Template Form'}</h2>
                <p>{modalMode === 'view' ? 'Read-only template form preview.' : 'Fill required fields and customize sections, criteria, and score ranges.'}</p>
              </div>
              <button className="appraisal-modal-close" type="button" onClick={closeModal}><i className="bi bi-x-lg" /></button>
            </div>
            <div className="appraisal-modal-body template-form-modal-body">
              <div className="appraisal-template-banner center">
                <h2>Performance Evaluation Form</h2>
                <p>ACE Data Systems Ltd.</p>
              </div>
              {modalMode === 'view' ? renderTemplatePreview() : renderTemplateEditor()}
            </div>
            <div className="appraisal-modal-footer">
              <button className="appraisal-button secondary" type="button" onClick={closeModal}>Close</button>
              {modalMode === 'view' && selectedTemplate && (
                <button className="appraisal-button primary" type="button" onClick={() => useThisTemplate(selectedTemplate.id)}>Use This Template</button>
              )}
              {modalMode === 'create' && (
                <button className="appraisal-button primary" type="button" disabled={loading} onClick={() => void createTemplate()}>Create Template</button>
              )}
              {modalMode === 'edit' && (
                <button className="appraisal-button primary" type="button" disabled={loading} onClick={() => void saveEdit()}>Save Changes</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppraisalTemplateRecordsPage;
