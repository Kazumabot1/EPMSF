import {
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type DragEvent,
    type ReactNode,
} from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../services/api';

type NoticeType = 'success' | 'error' | 'info';

type NoticeState = {
    type: NoticeType;
    message: string;
} | null;

type IconName =
    | 'alert'
    | 'arrow'
    | 'check'
    | 'clock'
    | 'download'
    | 'file'
    | 'info'
    | 'refresh'
    | 'search'
    | 'table'
    | 'upload'
    | 'users'
    | 'x';

type ImportRowStatus = 'CREATED' | 'UPDATED' | 'SKIPPED' | 'FAILED' | 'SUCCESS' | 'UNKNOWN';

type ImportResultRow = {
    rowNumber?: number | null;
    fullName?: string | null;
    employeeCode?: string | null;
    email?: string | null;
    status: ImportRowStatus;
    message?: string | null;
};

type ImportSummary = {
    totalRows: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
};

type NormalizedImportResult = {
    message: string;
    summary: ImportSummary;
    rows: ImportResultRow[];
};

type ParsedFileRow = {
    rowNumber: number;
    values: Record<string, string>;
};

type ValidationIssue = {
    type: 'error' | 'warning';
    message: string;
};

type PreviewRow = {
    rowNumber: number;
    fullName: string;
    email: string;
    employeeCode: string;
    departmentName: string;
    positionName: string;
    roleName: string;
    dashboard: string;
    issues: ValidationIssue[];
};

type FileValidation = {
    status: 'valid' | 'invalid';
    message: string;
    columns: string[];
    missingRequiredColumns: string[];
    rows: PreviewRow[];
    summary: {
        totalRows: number;
        validRows: number;
        errors: number;
        warnings: number;
    };
};

const IMPORT_ENDPOINTS = [
    '/users/import',
    '/users/import-accounts',
    '/employees/import-accounts',
    '/employees/import',
];

const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const REQUIRED_COLUMNS = ['fullName', 'email'];

const RECOMMENDED_COLUMNS = [
    'employeeCode',
    'departmentName',
    'positionName',
    'roleName',
    'dashboard',
];

const TEMPLATE_COLUMNS = [
    'fullName',
    'email',
    'employeeCode',
    'departmentName',
    'positionName',
    'roleName',
    'dashboard',
];

const SAMPLE_TEMPLATE_ROW = [
    'Aye Aye',
    'ayeaye@company.com',
    'EMP001',
    'Engineering',
    'Software Engineer',
    'EMPLOYEE',
    'EMPLOYEE_DASHBOARD',
];

const VALID_ROLES = ['EMPLOYEE', 'HR', 'ADMIN', 'MANAGER', 'DEPARTMENT_HEAD', 'CEO'];

const VALID_DASHBOARDS = [
    'EMPLOYEE_DASHBOARD',
    'MANAGER_DASHBOARD',
    'DEPARTMENT_HEAD_DASHBOARD',
    'HR_DASHBOARD',
    'EXECUTIVE_DASHBOARD',
    'ADMIN_DASHBOARD',
];

const COLUMN_ALIASES: Record<string, string[]> = {
    fullName: ['fullname', 'full_name', 'name', 'employeename', 'employee_name', 'username'],
    email: ['email', 'gmail', 'mail', 'usernameemail', 'useremail'],
    employeeCode: [
        'employeecode',
        'employee_code',
        'employeeid',
        'employee_id',
        'staffid',
        'staff_id',
        'code',
    ],
    departmentName: ['departmentname', 'department_name', 'department', 'dept', 'deptname'],
    positionName: ['positionname', 'position_name', 'position', 'positiontitle', 'jobtitle', 'job_title'],
    roleName: ['rolename', 'role_name', 'role', 'dashboardrole'],
    dashboard: ['dashboard', 'dashboardname', 'dashboard_name', 'landingdashboard', 'workspace'],
};

const iconPaths: Record<IconName, string> = {
    alert:
        'M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z',
    arrow: 'M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3',
    check: 'm5 13 4 4L19 7',
    clock: 'M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    file:
        'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6M8 13h8M8 17h6',
    info: 'M12 16v-4m0-4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
    refresh: 'M4 4v6h6M20 20v-6h-6M5 15a7 7 0 0 0 12 3l3-4M19 9A7 7 0 0 0 7 6l-3 4',
    search: 'm21 21-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z',
    table: 'M4 5h16v14H4V5Zm0 5h16M9 5v14',
    upload: 'M12 21V9m0 0-4 4m4-4 4 4M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2',
    users:
        'M16 21a6 6 0 0 0-12 0M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10 10a5 5 0 0 0-5-5m1-10a3 3 0 1 1 0 6',
    x: 'M6 6l12 12M18 6 6 18',
};

const Icon = ({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) => (
    <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d={iconPaths[name]} />
    </svg>
);

const unwrap = <T,>(payload: unknown, fallback: T): T => {
    const response = payload as { data?: unknown } | undefined;
    const body = response?.data as { data?: unknown } | undefined;

    return (body?.data ?? response?.data ?? fallback) as T;
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
    const err = error as {
        response?: {
            status?: number;
            data?: {
                message?: string;
                error?: string;
            };
        };
        message?: string;
    };

    return err.response?.data?.message || err.response?.data?.error || err.message || fallback;
};

const getApiStatus = (error: unknown) => {
    const err = error as { response?: { status?: number } };
    return err.response?.status;
};

const isFallbackStatus = (error: unknown) => {
    const status = getApiStatus(error);
    return status === 404 || status === 405;
};

const numberValue = (value: unknown) => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
};

const stringValue = (value: unknown) => {
    if (value === null || value === undefined) return '';
    return String(value);
};

const normalizeHeaderText = (value: string) =>
    value
        .trim()
        .replace(/^\uFEFF/, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase();

const resolveCanonicalColumn = (header: string) => {
    const normalized = normalizeHeaderText(header);

    return (
        Object.entries(COLUMN_ALIASES).find(([, aliases]) =>
            aliases.map(normalizeHeaderText).includes(normalized),
        )?.[0] ?? null
    );
};

const normalizeRoleValue = (value: string) =>
    value
        .trim()
        .replace(/^ROLE_/i, '')
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toUpperCase();

const normalizeDashboardValue = (value: string) =>
    value
        .trim()
        .replace(/^ROLE_/i, '')
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toUpperCase();

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const isEmptyRow = (row: string[]) => row.every((cell) => !String(cell ?? '').trim());

const normalizeStatus = (value: unknown, success?: unknown): ImportRowStatus => {
    const raw = stringValue(value).trim().toUpperCase();

    if (raw.includes('CREATED')) return 'CREATED';
    if (raw.includes('UPDATED')) return 'UPDATED';
    if (raw.includes('SKIP')) return 'SKIPPED';
    if (raw.includes('FAIL') || raw.includes('ERROR') || raw.includes('INVALID')) return 'FAILED';
    if (raw.includes('SUCCESS')) return 'SUCCESS';

    if (success === true) return 'SUCCESS';
    if (success === false) return 'FAILED';

    return 'UNKNOWN';
};

const getRowStatusTone = (status: ImportRowStatus) => {
    switch (status) {
        case 'CREATED':
        case 'UPDATED':
        case 'SUCCESS':
            return 'green';
        case 'SKIPPED':
            return 'amber';
        case 'FAILED':
            return 'red';
        default:
            return 'slate';
    }
};

const getSummaryFromRows = (rows: ImportResultRow[]): ImportSummary => {
    const created = rows.filter((row) => row.status === 'CREATED').length;
    const updated = rows.filter((row) => row.status === 'UPDATED').length;
    const skipped = rows.filter((row) => row.status === 'SKIPPED').length;
    const failed = rows.filter((row) => row.status === 'FAILED').length;

    return {
        totalRows: rows.length,
        created,
        updated,
        skipped,
        failed,
    };
};

const normalizeImportRow = (row: unknown, index: number): ImportResultRow => {
    const item = row as Record<string, unknown>;

    return {
        rowNumber: numberValue(
            item.rowNumber ?? item.row ?? item.lineNumber ?? item.line ?? item.index ?? index + 1,
        ),
        fullName: stringValue(item.fullName ?? item.name ?? item.employeeName ?? item.userName) || null,
        employeeCode: stringValue(item.employeeCode ?? item.staffId ?? item.code ?? item.employeeId) || null,
        email: stringValue(item.email ?? item.gmail ?? item.username) || null,
        status: normalizeStatus(item.status ?? item.result ?? item.action, item.success),
        message:
            stringValue(item.message ?? item.error ?? item.reason ?? item.details ?? item.smtpErrorDetail) || null,
    };
};

const normalizeImportResponse = (response: unknown): NormalizedImportResult => {
    const payload = unwrap<unknown>(response, {});
    const root = (payload ?? {}) as Record<string, unknown>;

    const rawRows =
        (Array.isArray(payload) && payload) ||
        (Array.isArray(root.rows) && root.rows) ||
        (Array.isArray(root.results) && root.results) ||
        (Array.isArray(root.items) && root.items) ||
        (Array.isArray(root.details) && root.details) ||
        (Array.isArray(root.importResults) && root.importResults) ||
        [];

    const rows = rawRows.map((row, index) => normalizeImportRow(row, index));
    const computedSummary = getSummaryFromRows(rows);
    const rawSummary = (root.summary ?? root.counts ?? {}) as Record<string, unknown>;

    const summary: ImportSummary = {
        totalRows: numberValue(
            root.totalRows ?? root.total ?? rawSummary.totalRows ?? rawSummary.total ?? computedSummary.totalRows,
        ),
        created: numberValue(
            root.created ?? root.createdCount ?? rawSummary.created ?? rawSummary.createdCount ?? computedSummary.created,
        ),
        updated: numberValue(
            root.updated ?? root.updatedCount ?? rawSummary.updated ?? rawSummary.updatedCount ?? computedSummary.updated,
        ),
        skipped: numberValue(
            root.skipped ?? root.skippedCount ?? rawSummary.skipped ?? rawSummary.skippedCount ?? computedSummary.skipped,
        ),
        failed: numberValue(
            root.failed ??
            root.failedCount ??
            root.errors ??
            rawSummary.failed ??
            rawSummary.failedCount ??
            rawSummary.errors ??
            computedSummary.failed,
        ),
    };

    return {
        message:
            stringValue(root.message) ||
            stringValue((response as { data?: { message?: string } })?.data?.message) ||
            'Import completed.',
        summary,
        rows,
    };
};

const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 KB';

    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;

    return `${(kb / 1024).toFixed(2)} MB`;
};

const isAcceptedFile = (file: File) => {
    const name = file.name.toLowerCase();
    return name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv');
};

const parseCsvText = (text: string) => {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let insideQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        const nextChar = text[index + 1];

        if (char === '"' && insideQuotes && nextChar === '"') {
            cell += '"';
            index += 1;
            continue;
        }

        if (char === '"') {
            insideQuotes = !insideQuotes;
            continue;
        }

        if (char === ',' && !insideQuotes) {
            row.push(cell.trim());
            cell = '';
            continue;
        }

        if ((char === '\n' || char === '\r') && !insideQuotes) {
            if (char === '\r' && nextChar === '\n') {
                index += 1;
            }

            row.push(cell.trim());
            cell = '';

            if (!isEmptyRow(row)) {
                rows.push(row);
            }

            row = [];
            continue;
        }

        cell += char;
    }

    row.push(cell.trim());

    if (!isEmptyRow(row)) {
        rows.push(row);
    }

    return rows;
};

const readFileAsText = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(new Error('Unable to read the selected file.'));

        reader.readAsText(file);
    });

const readFileAsArrayBuffer = (file: File) =>
    new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(new Error('Unable to read the selected file.'));

        reader.readAsArrayBuffer(file);
    });

const parseSpreadsheetFile = async (file: File) => {
    const name = file.name.toLowerCase();

    if (name.endsWith('.csv')) {
        const text = await readFileAsText(file);
        return parseCsvText(text);
    }

    try {
        const XLSX = await import('xlsx');
        const buffer = await readFileAsArrayBuffer(file);
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
            throw new Error('The Excel file does not contain any sheets.');
        }

        const sheet = workbook.Sheets[firstSheetName];

        return XLSX.utils.sheet_to_json<string[]>(sheet, {
            header: 1,
            defval: '',
            blankrows: false,
        });
    } catch (error) {
        console.error('Failed to parse Excel file', error);

        throw new Error(
            'Unable to preview this Excel file. Please make sure the xlsx package is installed, or upload a CSV file.',
        );
    }
};

const buildParsedRows = (matrix: string[][]): { columns: string[]; rows: ParsedFileRow[] } => {
    const firstNonEmptyIndex = matrix.findIndex((row) => !isEmptyRow(row));

    if (firstNonEmptyIndex === -1) {
        return { columns: [], rows: [] };
    }

    const headers = matrix[firstNonEmptyIndex].map((header) => String(header ?? '').trim());
    const canonicalByIndex = headers.map((header) => resolveCanonicalColumn(header));

    const rows = matrix
        .slice(firstNonEmptyIndex + 1)
        .map((row, index) => {
            const values: Record<string, string> = {};

            canonicalByIndex.forEach((canonical, columnIndex) => {
                if (!canonical) return;
                values[canonical] = String(row[columnIndex] ?? '').trim();
            });

            return {
                rowNumber: firstNonEmptyIndex + index + 2,
                values,
            };
        })
        .filter((row) => Object.values(row.values).some((value) => value.trim()));

    return { columns: headers, rows };
};

const validateParsedRows = (columns: string[], rows: ParsedFileRow[]): FileValidation => {
    const resolvedColumns = new Set(
        columns
            .map((column) => resolveCanonicalColumn(column))
            .filter((column): column is string => Boolean(column)),
    );

    const missingRequiredColumns = REQUIRED_COLUMNS.filter((column) => !resolvedColumns.has(column));
    const emailCounts = new Map<string, number>();

    rows.forEach((row) => {
        const email = row.values.email?.trim().toLowerCase();

        if (email) {
            emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1);
        }
    });

    const previewRows: PreviewRow[] = rows.map((row) => {
        const fullName = row.values.fullName ?? '';
        const email = row.values.email ?? '';
        const employeeCode = row.values.employeeCode ?? '';
        const departmentName = row.values.departmentName ?? '';
        const positionName = row.values.positionName ?? '';
        const roleName = row.values.roleName ?? '';
        const dashboard = row.values.dashboard ?? '';
        const issues: ValidationIssue[] = [];

        if (!fullName.trim()) {
            issues.push({ type: 'error', message: 'Full name is required.' });
        }

        if (!email.trim()) {
            issues.push({ type: 'error', message: 'Email is required.' });
        } else if (!isValidEmail(email)) {
            issues.push({ type: 'error', message: 'Email format is invalid.' });
        }

        if (email.trim() && (emailCounts.get(email.trim().toLowerCase()) ?? 0) > 1) {
            issues.push({ type: 'error', message: 'Duplicate email inside this file.' });
        }

        if (!roleName.trim()) {
            issues.push({ type: 'warning', message: 'Role is empty; backend may apply a default.' });
        } else if (!VALID_ROLES.includes(normalizeRoleValue(roleName))) {
            issues.push({ type: 'error', message: 'Role value is not supported.' });
        }

        if (!dashboard.trim()) {
            issues.push({ type: 'warning', message: 'Dashboard is empty; backend may apply a default.' });
        } else if (!VALID_DASHBOARDS.includes(normalizeDashboardValue(dashboard))) {
            issues.push({ type: 'error', message: 'Dashboard value is not supported.' });
        }

        return {
            rowNumber: row.rowNumber,
            fullName,
            email,
            employeeCode,
            departmentName,
            positionName,
            roleName,
            dashboard,
            issues,
        };
    });

    const missingColumnErrors = missingRequiredColumns.length;
    const rowErrors = previewRows.reduce(
        (total, row) => total + row.issues.filter((issue) => issue.type === 'error').length,
        0,
    );
    const warnings = previewRows.reduce(
        (total, row) => total + row.issues.filter((issue) => issue.type === 'warning').length,
        0,
    );

    const errors = missingColumnErrors + rowErrors;
    const validRows = previewRows.filter((row) => !row.issues.some((issue) => issue.type === 'error')).length;

    if (columns.length === 0) {
        return {
            status: 'invalid',
            message: 'The file is empty or does not contain a readable header row.',
            columns,
            missingRequiredColumns: REQUIRED_COLUMNS,
            rows: [],
            summary: {
                totalRows: 0,
                validRows: 0,
                errors: REQUIRED_COLUMNS.length,
                warnings: 0,
            },
        };
    }

    if (rows.length === 0) {
        return {
            status: 'invalid',
            message: 'The file has headers but no employee rows to import.',
            columns,
            missingRequiredColumns,
            rows: [],
            summary: {
                totalRows: 0,
                validRows: 0,
                errors: Math.max(1, missingColumnErrors),
                warnings,
            },
        };
    }

    return {
        status: errors > 0 ? 'invalid' : 'valid',
        message:
            errors > 0
                ? 'Please fix validation errors before importing.'
                : warnings > 0
                    ? 'File is valid, but some rows have warnings.'
                    : 'File is ready to import.',
        columns,
        missingRequiredColumns,
        rows: previewRows,
        summary: {
            totalRows: previewRows.length,
            validRows,
            errors,
            warnings,
        },
    };
};

const escapeCsvCell = (value: string) => {
    const shouldQuote = value.includes(',') || value.includes('"') || value.includes('\n');

    if (!shouldQuote) return value;

    return `"${value.replace(/"/g, '""')}"`;
};

const downloadCsvTemplate = () => {
    const rows = [TEMPLATE_COLUMNS, SAMPLE_TEMPLATE_ROW];

    const content = rows
        .map((row) => row.map(escapeCsvCell).join(','))
        .join('\r\n');

    const bom = '\uFEFF';
    const blob = new Blob([bom, content], {
        type: 'text/csv;charset=utf-8;',
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `employee-account-import-template-${new Date().toISOString().slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
};

const StatusPill = ({
                        children,
                        tone,
                    }: {
    children: ReactNode;
    tone: 'green' | 'red' | 'blue' | 'slate' | 'amber' | 'violet';
}) => {
    const toneClass = {
        green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        red: 'bg-rose-50 text-rose-700 ring-rose-200',
        blue: 'bg-blue-50 text-blue-700 ring-blue-200',
        slate: 'bg-slate-100 text-slate-700 ring-slate-200',
        amber: 'bg-amber-50 text-amber-700 ring-amber-200',
        violet: 'bg-blue-50 text-blue-700 ring-blue-200',
    }[tone];

    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${toneClass}`}>
      {children}
    </span>
    );
};

const Notice = ({ notice, onClose }: { notice: NoticeState; onClose: () => void }) => {
    if (!notice) return null;

    const toneClass = {
        success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        error: 'border-rose-200 bg-rose-50 text-rose-800',
        info: 'border-blue-200 bg-blue-50 text-blue-800',
    }[notice.type];

    return (
        <div className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${toneClass}`}>
      <span className="flex min-w-0 items-start gap-2">
        <Icon
            name={notice.type === 'error' ? 'alert' : notice.type === 'success' ? 'check' : 'info'}
            className="mt-0.5 h-4 w-4 flex-shrink-0"
        />
        <span>{notice.message}</span>
      </span>

            <button type="button" className="text-current opacity-70 hover:opacity-100" onClick={onClose}>
                <Icon name="x" className="h-4 w-4" />
            </button>
        </div>
    );
};

const Panel = ({
                   title,
                   subtitle,
                   icon,
                   action,
                   children,
               }: {
    title: string;
    subtitle?: string;
    icon?: IconName;
    action?: ReactNode;
    children: ReactNode;
}) => (
    <section className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 items-start gap-3">
                {icon && (
                    <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
            <Icon name={icon} className="h-5 w-5" />
          </span>
                )}

                <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-950">{title}</h2>
                    {subtitle && <p className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</p>}
                </div>
            </div>

            {action && <div className="flex flex-shrink-0 justify-start md:justify-end">{action}</div>}
        </div>

        <div className="min-w-0 flex-1 p-5">{children}</div>
    </section>
);

const MetricCard = ({
                        label,
                        value,
                        helper,
                        icon,
                        tone = 'blue',
                    }: {
    label: string;
    value: string | number;
    helper: string;
    icon: IconName;
    tone?: 'blue' | 'green' | 'amber' | 'red' | 'violet';
}) => {
    const toneClass = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
        red: 'bg-rose-50 text-rose-600',
        violet: 'bg-blue-50 text-blue-600',
    }[tone];

    return (
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-500">{label}</p>
                    <strong className="mt-2 block text-2xl font-black tracking-tight text-slate-950">
                        {value}
                    </strong>
                </div>

                <span className={`grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl ${toneClass}`}>
          <Icon name={icon} className="h-5 w-5" />
        </span>
            </div>

            <p className="mt-3 text-sm leading-5 text-slate-500">{helper}</p>
        </article>
    );
};

const EmptyState = ({ title, message }: { title: string; message: string }) => (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm">
            <Icon name="info" className="h-5 w-5" />
        </div>

        <h3 className="mt-3 text-sm font-bold text-slate-900">{title}</h3>
        <p className="mx-auto mt-1 max-w-md text-sm leading-5 text-slate-500">{message}</p>
    </div>
);

function HrEmployeeAccountImport() {
    const location = useLocation();
    const isAdminRoute = location.pathname.startsWith('/admin');

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [dragging, setDragging] = useState(false);
    const [validating, setValidating] = useState(false);
    const [validation, setValidation] = useState<FileValidation | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [notice, setNotice] = useState<NoticeState>(null);
    const [result, setResult] = useState<NormalizedImportResult | null>(null);
    const [previewSearchTerm, setPreviewSearchTerm] = useState('');
    const [resultSearchTerm, setResultSearchTerm] = useState('');

    const accountsPath = isAdminRoute ? '/admin/users' : '/hr/employee';

    const canImport = Boolean(
        selectedFile && validation && validation.status === 'valid' && !validating && !uploading,
    );

    const validationSummary = validation?.summary ?? {
        totalRows: 0,
        validRows: 0,
        errors: 0,
        warnings: 0,
    };

    const importSummary = result?.summary ?? {
        totalRows: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
    };

    const importSuccessfulRows = importSummary.created + importSummary.updated;
    const importAttentionRows = importSummary.skipped + importSummary.failed;

    const filteredPreviewRows = useMemo(() => {
        const rows = validation?.rows ?? [];
        const term = previewSearchTerm.trim().toLowerCase();

        if (!term) return rows;

        return rows.filter((row) =>
            [
                row.rowNumber,
                row.fullName,
                row.email,
                row.employeeCode,
                row.departmentName,
                row.positionName,
                row.roleName,
                row.dashboard,
                row.issues.map((issue) => issue.message).join(' '),
            ]
                .filter((value) => value !== null && value !== undefined)
                .some((value) => String(value).toLowerCase().includes(term)),
        );
    }, [previewSearchTerm, validation?.rows]);

    const filteredResultRows = useMemo(() => {
        const rows = result?.rows ?? [];
        const term = resultSearchTerm.trim().toLowerCase();

        if (!term) return rows;

        return rows.filter((row) =>
            [row.fullName, row.email, row.employeeCode, row.status, row.message, row.rowNumber]
                .filter((value) => value !== null && value !== undefined)
                .some((value) => String(value).toLowerCase().includes(term)),
        );
    }, [result?.rows, resultSearchTerm]);

    const runValidation = async (file: File) => {
        try {
            setValidating(true);
            setValidation(null);
            setResult(null);
            setUploadProgress(0);
            setPreviewSearchTerm('');
            setResultSearchTerm('');
            setNotice(null);

            const matrix = await parseSpreadsheetFile(file);
            const parsed = buildParsedRows(matrix);
            const fileValidation = validateParsedRows(parsed.columns, parsed.rows);

            setValidation(fileValidation);
            setNotice(null);
        } catch (error: unknown) {
            setValidation({
                status: 'invalid',
                message: error instanceof Error ? error.message : 'Unable to validate the selected file.',
                columns: [],
                missingRequiredColumns: REQUIRED_COLUMNS,
                rows: [],
                summary: {
                    totalRows: 0,
                    validRows: 0,
                    errors: 1,
                    warnings: 0,
                },
            });

            setNotice(null);
        } finally {
            setValidating(false);
        }
    };

    const validateAndSelectFile = (file: File | null) => {
        setNotice(null);
        setResult(null);
        setValidation(null);
        setUploadProgress(0);
        setPreviewSearchTerm('');
        setResultSearchTerm('');

        if (!file) return;

        if (!isAcceptedFile(file)) {
            setSelectedFile(null);
            setNotice({
                type: 'error',
                message: 'Please upload an Excel or CSV file only. Supported formats: .xlsx, .xls, .csv.',
            });
            return;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            setSelectedFile(null);
            setNotice({
                type: 'error',
                message: `File is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`,
            });
            return;
        }

        setSelectedFile(file);
        void runValidation(file);
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        validateAndSelectFile(event.target.files?.[0] ?? null);
        event.target.value = '';
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();

        setDragging(false);
        validateAndSelectFile(event.dataTransfer.files?.[0] ?? null);
    };

    const uploadToEndpoint = async (endpoint: string, file: File) => {
        const formData = new FormData();

        formData.append('file', file);
        formData.append('sendTemporaryPasswordEmail', 'true');

        return api.post(endpoint, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (event) => {
                if (!event.total) return;
                setUploadProgress(Math.round((event.loaded / event.total) * 100));
            },
        });
    };

    const uploadWithFallback = async (file: File) => {
        let lastError: unknown = null;

        for (const endpoint of IMPORT_ENDPOINTS) {
            try {
                return await uploadToEndpoint(endpoint, file);
            } catch (error) {
                lastError = error;

                if (!isFallbackStatus(error)) {
                    throw error;
                }
            }
        }

        throw lastError;
    };

    const handleImport = async () => {
        if (!selectedFile) {
            setNotice({
                type: 'error',
                message: 'Please choose an Excel or CSV file before importing.',
            });
            return;
        }

        if (!validation) {
            setNotice({
                type: 'error',
                message: 'Please wait until file validation is finished.',
            });
            return;
        }

        if (validation.status === 'invalid') {
            setNotice(null);
            return;
        }

        try {
            setUploading(true);
            setUploadProgress(0);
            setNotice(null);
            setResult(null);

            const response = await uploadWithFallback(selectedFile);
            const normalizedResult = normalizeImportResponse(response);

            setResult(normalizedResult);
            setUploadProgress(100);

            setNotice({
                type: normalizedResult.summary.failed > 0 ? 'info' : 'success',
                message: normalizedResult.message,
            });
        } catch (error: unknown) {
            setUploadProgress(0);
            setResult(null);
            setNotice({
                type: 'error',
                message: getApiErrorMessage(error, 'Import failed. Please check the file and try again.'),
            });
        } finally {
            setUploading(false);
        }
    };

    const clearFile = () => {
        setSelectedFile(null);
        setUploadProgress(0);
        setNotice(null);
        setResult(null);
        setValidation(null);
        setPreviewSearchTerm('');
        setResultSearchTerm('');
    };

    return (
        <div className="min-w-0 space-y-5 text-slate-900">
            <Notice notice={notice} onClose={() => setNotice(null)} />

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-700">
                            <Icon name="upload" className="h-4 w-4" />
                            Account Import
                        </div>

                        <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                            Import Accounts
                        </h1>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                            Upload an Excel or CSV file, validate the rows, preview errors, and import employee login accounts in bulk.
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                        <button
                            type="button"
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            onClick={downloadCsvTemplate}
                        >
                            <Icon name="download" className="h-4 w-4" />
                            Download CSV Template
                        </button>

                        <Link
                            to={accountsPath}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
                        >
                            View Accounts
                            <Icon name="arrow" className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </section>

            <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    label="Parsed Rows"
                    value={validationSummary.totalRows}
                    helper="Rows found in file"
                    icon="table"
                />
                <MetricCard
                    label="Valid Rows"
                    value={validationSummary.validRows}
                    helper="Ready to import"
                    icon="check"
                    tone="green"
                />
                <MetricCard
                    label="Errors"
                    value={validationSummary.errors}
                    helper="Must fix before import"
                    icon="alert"
                    tone={validationSummary.errors > 0 ? 'red' : 'green'}
                />
                <MetricCard
                    label="Warnings"
                    value={validationSummary.warnings}
                    helper="Review before import"
                    icon="info"
                    tone={validationSummary.warnings > 0 ? 'amber' : 'blue'}
                />
            </div>

            <div className="grid min-w-0 items-stretch gap-4 xl:grid-cols-[1.05fr_.95fr]">
                <Panel
                    title="Upload and Validate File"
                    subtitle="Choose an Excel or CSV file. The file will be checked before importing."
                    icon="upload"
                >
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => fileInputRef.current?.click()}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                fileInputRef.current?.click();
                            }
                        }}
                        onDragOver={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setDragging(true);
                        }}
                        onDragLeave={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setDragging(false);
                        }}
                        onDrop={handleDrop}
                        className={`cursor-pointer rounded-3xl border-2 border-dashed p-6 text-center transition ${
                            dragging
                                ? 'border-blue-400 bg-blue-50'
                                : 'border-slate-200 bg-slate-50/70 hover:border-blue-300 hover:bg-blue-50/50'
                        }`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            className="hidden"
                            onChange={handleFileChange}
                        />

                        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm">
                            <Icon name="file" className="h-6 w-6" />
                        </div>

                        <h3 className="mt-4 text-sm font-black text-slate-950">
                            Drop your file here or click to browse
                        </h3>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                            Supported formats are .xlsx, .xls, and .csv. Maximum file size is {MAX_FILE_SIZE_MB} MB.
                        </p>
                    </div>

                    {selectedFile && (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon name="file" className="h-5 w-5" />
                  </span>

                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-black text-slate-900">{selectedFile.name}</p>
                                        <p className="mt-0.5 text-xs font-semibold text-slate-500">
                                            {formatFileSize(selectedFile.size)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                        onClick={() => void runValidation(selectedFile)}
                                        disabled={uploading || validating}
                                    >
                                        <Icon name="refresh" className="h-4 w-4" />
                                        {validating ? 'Validating...' : 'Validate Again'}
                                    </button>

                                    <button
                                        type="button"
                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                                        onClick={clearFile}
                                        disabled={uploading}
                                    >
                                        <Icon name="x" className="h-4 w-4" />
                                        Remove
                                    </button>
                                </div>
                            </div>

                            {validation && (
                                <div
                                    className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                                        validation.status === 'valid'
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                            : 'border-rose-200 bg-rose-50 text-rose-800'
                                    }`}
                                >
                                    <div className="flex items-start gap-2">
                                        <Icon
                                            name={validation.status === 'valid' ? 'check' : 'alert'}
                                            className="mt-0.5 h-4 w-4 flex-shrink-0"
                                        />
                                        <div>
                                            <p>{validation.message}</p>
                                            {validation.missingRequiredColumns.length > 0 && (
                                                <p className="mt-1">
                                                    Missing required columns: {validation.missingRequiredColumns.join(', ')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {uploading && (
                                <div className="mt-4">
                                    <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
                                        <span>Uploading</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                                        <div
                                            className="h-full rounded-full bg-blue-600 transition-all"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <button
                            type="button"
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={handleImport}
                            disabled={!canImport}
                        >
                            <Icon name={uploading ? 'clock' : 'upload'} className="h-4 w-4" />
                            {uploading
                                ? 'Importing...'
                                : validating
                                    ? 'Validating file...'
                                    : validation?.status === 'invalid'
                                        ? 'Fix Validation Errors'
                                        : 'Import Accounts'}
                        </button>

                        <button
                            type="button"
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                        >
                            Choose File
                        </button>
                    </div>
                </Panel>

                <Panel
                    title="File Requirements"
                    subtitle="Use these columns so accounts can be matched correctly."
                    icon="info"
                >
                    <div className="space-y-3">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                            <p className="text-sm font-black text-slate-900">Required columns</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {REQUIRED_COLUMNS.map((column) => (
                                    <StatusPill key={column} tone="blue">
                                        {column}
                                    </StatusPill>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                            <p className="text-sm font-black text-slate-900">Recommended columns</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {RECOMMENDED_COLUMNS.map((column) => (
                                    <StatusPill key={column} tone="slate">
                                        {column}
                                    </StatusPill>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                            <p className="text-sm font-black text-slate-900">Accepted values</p>
                            <div className="mt-3 space-y-3 text-sm leading-6 text-slate-500">
                                <p>
                                    <span className="font-bold text-slate-700">roleName:</span>{' '}
                                    {VALID_ROLES.join(', ')}
                                </p>
                                <p>
                                    <span className="font-bold text-slate-700">dashboard:</span>{' '}
                                    {VALID_DASHBOARDS.join(', ')}
                                </p>
                            </div>
                        </div>
                    </div>
                </Panel>
            </div>

            {validation && (
                <Panel
                    title="Validation Preview"
                    subtitle="Review parsed rows before importing. Rows with errors must be fixed first."
                    icon="table"
                    action={
                        validation.rows.length > 0 ? (
                            <div className="relative min-w-0 md:w-72">
                                <Icon
                                    name="search"
                                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                />
                                <input
                                    type="search"
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                                    placeholder="Search preview..."
                                    value={previewSearchTerm}
                                    onChange={(event) => setPreviewSearchTerm(event.target.value)}
                                />
                            </div>
                        ) : null
                    }
                >
                    {validation.rows.length === 0 ? (
                        <EmptyState
                            title="No preview rows"
                            message="Choose a file with a header row and at least one employee account row."
                        />
                    ) : filteredPreviewRows.length === 0 ? (
                        <EmptyState
                            title="No matching rows"
                            message="Try another keyword or clear the search field."
                        />
                    ) : (
                        <div className="overflow-x-auto rounded-2xl border border-slate-200">
                            <table className="w-full min-w-[1180px] divide-y divide-slate-200 text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="w-20 px-4 py-3">Row</th>
                                    <th className="min-w-[190px] px-4 py-3">Full Name</th>
                                    <th className="min-w-[220px] px-4 py-3">Email</th>
                                    <th className="min-w-[150px] px-4 py-3">Code</th>
                                    <th className="min-w-[160px] px-4 py-3">Department</th>
                                    <th className="min-w-[160px] px-4 py-3">Position</th>
                                    <th className="min-w-[140px] px-4 py-3">Role</th>
                                    <th className="min-w-[190px] px-4 py-3">Dashboard</th>
                                    <th className="min-w-[260px] px-4 py-3">Validation</th>
                                </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredPreviewRows.map((row) => {
                                    const hasError = row.issues.some((issue) => issue.type === 'error');
                                    const hasWarning = row.issues.some((issue) => issue.type === 'warning');

                                    return (
                                        <tr key={row.rowNumber} className="hover:bg-slate-50/80">
                                            <td className="px-4 py-3 font-semibold text-slate-500">{row.rowNumber}</td>
                                            <td className="px-4 py-3 font-semibold text-slate-700">{row.fullName || '—'}</td>
                                            <td className="px-4 py-3">
                          <span className="block max-w-[230px] truncate font-semibold text-slate-600">
                            {row.email || '—'}
                          </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{row.employeeCode || '—'}</td>
                                            <td className="px-4 py-3 text-slate-600">{row.departmentName || '—'}</td>
                                            <td className="px-4 py-3 text-slate-600">{row.positionName || '—'}</td>
                                            <td className="px-4 py-3 text-slate-600">{row.roleName || '—'}</td>
                                            <td className="px-4 py-3 text-slate-600">{row.dashboard || '—'}</td>
                                            <td className="px-4 py-3">
                                                {row.issues.length === 0 ? (
                                                    <StatusPill tone="green">Ready</StatusPill>
                                                ) : (
                                                    <div className="flex flex-col gap-1.5">
                                                        {hasError && <StatusPill tone="red">Error</StatusPill>}
                                                        {!hasError && hasWarning && <StatusPill tone="amber">Warning</StatusPill>}
                                                        <div className="space-y-1 text-xs font-semibold text-slate-500">
                                                            {row.issues.map((issue, index) => (
                                                                <p key={`${row.rowNumber}-${issue.message}-${index}`}>• {issue.message}</p>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>
            )}

            {result && (
                <>
                    <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <MetricCard
                            label="Successful"
                            value={importSuccessfulRows}
                            helper="Created or updated"
                            icon="check"
                            tone="green"
                        />
                        <MetricCard
                            label="Created"
                            value={importSummary.created}
                            helper="New accounts added"
                            icon="users"
                            tone="blue"
                        />
                        <MetricCard
                            label="Updated"
                            value={importSummary.updated}
                            helper="Existing accounts changed"
                            icon="refresh"
                            tone="violet"
                        />
                        <MetricCard
                            label="Needs Attention"
                            value={importAttentionRows}
                            helper="Skipped or failed rows"
                            icon="alert"
                            tone={importAttentionRows > 0 ? 'amber' : 'green'}
                        />
                    </div>

                    <Panel
                        title="Import Results"
                        subtitle="Review row-level results after the import finishes."
                        icon="table"
                        action={
                            result.rows.length > 0 ? (
                                <div className="relative min-w-0 md:w-72">
                                    <Icon
                                        name="search"
                                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                    />
                                    <input
                                        type="search"
                                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                                        placeholder="Search results..."
                                        value={resultSearchTerm}
                                        onChange={(event) => setResultSearchTerm(event.target.value)}
                                    />
                                </div>
                            ) : null
                        }
                    >
                        {result.rows.length === 0 ? (
                            <EmptyState
                                title="No row details returned"
                                message="The import completed, but the server did not return row-level details."
                            />
                        ) : filteredResultRows.length === 0 ? (
                            <EmptyState
                                title="No matching rows"
                                message="Try another keyword or clear the search field."
                            />
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                <table className="w-full min-w-[920px] divide-y divide-slate-200 text-left text-sm">
                                    <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="w-20 px-4 py-3">Row</th>
                                        <th className="min-w-[220px] px-4 py-3">Name</th>
                                        <th className="min-w-[220px] px-4 py-3">Email</th>
                                        <th className="min-w-[150px] px-4 py-3">Employee Code</th>
                                        <th className="min-w-[130px] px-4 py-3">Status</th>
                                        <th className="min-w-[260px] px-4 py-3">Message</th>
                                    </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100 bg-white">
                                    {filteredResultRows.map((row, index) => (
                                        <tr key={`${row.rowNumber ?? index}-${row.email ?? index}`} className="hover:bg-slate-50/80">
                                            <td className="px-4 py-3 font-semibold text-slate-500">
                                                {row.rowNumber ?? index + 1}
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-slate-700">
                                                {row.fullName || '—'}
                                            </td>
                                            <td className="px-4 py-3">
                          <span className="block max-w-[230px] truncate font-semibold text-slate-600">
                            {row.email || '—'}
                          </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{row.employeeCode || '—'}</td>
                                            <td className="px-4 py-3">
                                                <StatusPill tone={getRowStatusTone(row.status)}>
                                                    {row.status}
                                                </StatusPill>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{row.message || '—'}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Panel>
                </>
            )}
        </div>
    );
}

export default HrEmployeeAccountImport;