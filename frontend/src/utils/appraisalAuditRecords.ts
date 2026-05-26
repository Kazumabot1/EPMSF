import type { AppraisalAuditLog } from '../services/appraisalService';

export type GroupedAppraisalAuditLog = AppraisalAuditLog & {
  changeCount?: number;
  sourceRecordIds?: number[];
  sourceRecords?: AppraisalAuditLog[];
};

const AUDIT_SAVE_GROUP_WINDOW_MS = 1000;

const normalizeAuditToken = (value?: string | null) => (value ?? '').trim().toLowerCase();

export const stripAuditInternalMarkers = (value?: string | null) => (value ?? '')
  .replace(/\s*@@templateId=\d+/ig, '')
  .replace(/\s*@@auditBatch=[a-z0-9-]+/ig, '')
  .trim();

const stripAuditTemplateMarker = stripAuditInternalMarkers;

const auditBatchId = (record: AppraisalAuditLog) => {
  const source = `${record.changedColumn ?? ''} ${record.newValue ?? ''} ${record.oldValue ?? ''}`;
  return source.match(/@@auditBatch=([a-z0-9-]+)/i)?.[1] ?? null;
};

const timestampMs = (value?: string | null) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const auditGroupingKey = (record: AppraisalAuditLog) => {
  const batchId = auditBatchId(record);
  if (batchId) {
    return [
      record.entityType,
      record.entityId,
      record.userId ?? '',
      record.action ?? '',
      batchId,
    ].join('|');
  }
  return [
    record.entityType,
    record.entityId,
    record.userId ?? '',
    record.action ?? '',
    record.reason ?? '',
  ].join('|');
};

const auditChangeState = (record: AppraisalAuditLog) => {
  const raw = stripAuditTemplateMarker(record.newValue);
  const separator = raw.indexOf('::');
  const state = normalizeAuditToken(separator >= 0 ? raw.slice(0, separator) : raw);
  if (state.includes('removed')) return 'removed';
  if (state.includes('added')) return 'added';
  return 'changed';
};

const auditChangedColumnTokens = (record: AppraisalAuditLog) => {
  const changedColumn = stripAuditTemplateMarker(record.changedColumn);
  if (!changedColumn) return ['Updated'];

  return changedColumn
    .split('|')
    .map((part) => stripAuditTemplateMarker(part))
    .map((part) => part.split(':')[0]?.trim() || '')
    .filter(Boolean);
};

const changedFieldCount = (records: AppraisalAuditLog[]) => {
  const fields = new Set<string>();
  records.forEach((record) => {
    auditChangedColumnTokens(record).forEach((field) => fields.add(normalizeAuditToken(field)));
  });
  return Math.max(fields.size, 1);
};

const joinAuditText = (values: Array<string | null | undefined>) => values
  .map((value) => stripAuditTemplateMarker(value))
  .filter(Boolean)
  .join('|');

const combineAuditRecordGroup = (records: AppraisalAuditLog[]): GroupedAppraisalAuditLog => {
  if (records.length <= 1) {
    return {
      ...records[0],
      changedColumn: stripAuditTemplateMarker(records[0].changedColumn),
      oldValue: stripAuditTemplateMarker(records[0].oldValue),
      newValue: stripAuditTemplateMarker(records[0].newValue),
      changeCount: changedFieldCount(records),
      sourceRecordIds: [records[0].id],
      sourceRecords: records,
    };
  }

  const representative = records[0];
  const changedColumn = records
    .flatMap((record) => auditChangedColumnTokens(record).map((field) => `${field}:${auditChangeState(record)}`));

  return {
    ...representative,
    changedColumn: changedColumn.join('|'),
    oldValue: joinAuditText(records.map((record) => record.oldValue)),
    newValue: joinAuditText(records.map((record) => record.newValue)),
    changeCount: changedFieldCount(records),
    sourceRecordIds: records.map((record) => record.id),
    sourceRecords: records.map((record) => ({
      ...record,
      changedColumn: stripAuditTemplateMarker(record.changedColumn),
      oldValue: stripAuditTemplateMarker(record.oldValue),
      newValue: stripAuditTemplateMarker(record.newValue),
    })),
  };
};

const sameSaveEvent = (left: AppraisalAuditLog, right: AppraisalAuditLog) => {
  if (auditGroupingKey(left) !== auditGroupingKey(right)) return false;

  const leftBatch = auditBatchId(left);
  const rightBatch = auditBatchId(right);
  if (leftBatch || rightBatch) {
    return !!leftBatch && leftBatch === rightBatch;
  }

  const leftTime = timestampMs(left.timestamp);
  const rightTime = timestampMs(right.timestamp);
  if (!leftTime || !rightTime) return false;
  return Math.abs(leftTime - rightTime) <= AUDIT_SAVE_GROUP_WINDOW_MS;
};

export const groupAppraisalAuditRecords = (records: AppraisalAuditLog[]): GroupedAppraisalAuditLog[] => {
  const sorted = [...records].sort((a, b) => {
    const byTime = timestampMs(b.timestamp) - timestampMs(a.timestamp);
    if (byTime !== 0) return byTime;
    return (b.id ?? 0) - (a.id ?? 0);
  });

  const groups: AppraisalAuditLog[][] = [];
  sorted.forEach((record) => {
    const currentGroup = groups[groups.length - 1];
    const currentHead = currentGroup?.[0];
    if (currentGroup && currentHead && sameSaveEvent(currentHead, record)) {
      currentGroup.push(record);
      return;
    }
    groups.push([record]);
  });

  return groups.map(combineAuditRecordGroup);
};

export const getAppraisalAuditChangeCount = (record: GroupedAppraisalAuditLog) => (
  record.changeCount && record.changeCount > 0 ? record.changeCount : changedFieldCount([record])
);

export const formatAppraisalAuditChangeCount = (record: GroupedAppraisalAuditLog) => {
  const count = getAppraisalAuditChangeCount(record);
  return `${count} ${count === 1 ? 'field' : 'fields'}`;
};
