import { useEffect, useMemo, useState, type SyntheticEvent } from "react";

import { Link, useNavigate } from "react-router-dom";

import toast from "react-hot-toast";

import ConfirmModal from "../../../components/ConfirmModal";

import KpiTemplateViewModal from "../../../components/hr/kpi-template/KpiTemplateViewModal";

import {
  formatTemplatePositionLabels,
  kpiStatusBadgeClass,
} from "../../../components/hr/kpi-template/kpiTemplateUi";

import { kpiTemplateService } from "../../../services/kpiTemplateService";

import { kpiTemplateCycleService } from "../../../services/kpiTemplateCycleService";

import type {
  KpiFormStatus,
  KpiTemplateResponse,
} from "../../../types/kpiTemplate";

const PAGE_SIZE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const STATUS_FILTER_OPTIONS: Array<{
  value: KpiFormStatus | "";
  label: string;
}> = [
  { value: "", label: "All statuses" },

  { value: "DRAFT", label: "Draft" },

  { value: "ACTIVE", label: "Active" },

  { value: "FINALIZED", label: "Finalized" },

  { value: "SENT", label: "Sent" },

  { value: "ARCHIVED", label: "Archived" },
];

const btnSecondary =
  "inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 no-underline shadow-sm transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

const btnPrimary =
  "inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-200 bg-[linear-gradient(135deg,#ffffff_0%,#eff6ff_100%)] px-4 text-sm font-bold text-blue-700 no-underline shadow-sm transition hover:border-blue-300 hover:from-blue-50 hover:to-blue-100";

const inputClass =
  "min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-sm outline-none transition hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

const stopRowOpen = (event: SyntheticEvent) => {
  event.stopPropagation();
};

const KpiTemplateListPage = () => {
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<KpiTemplateResponse[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [query, setQuery] = useState("");

  const [statusFilter, setStatusFilter] = useState<KpiFormStatus | "">("");

  const [page, setPage] = useState(1);

  const [pageSize, setPageSize] = useState<number>(10);

  const [viewTemplateId, setViewTemplateId] = useState<number | null>(null);

  const [templateToArchive, setTemplateToArchive] =
    useState<KpiTemplateResponse | null>(null);

  const [archiving, setArchiving] = useState(false);

  const [activeCycleTemplateIds, setActiveCycleTemplateIds] = useState<
    Set<number>
  >(new Set());

  const load = async () => {
    try {
      setLoading(true);

      setError("");

      const data = await kpiTemplateService.getAllTemplates();

      setTemplates(data);

      try {
        const cycles = await kpiTemplateCycleService.list();

        setActiveCycleTemplateIds(
          new Set(
            cycles

              .filter(
                (cycle) =>
                  cycle.status === "ACTIVE" || cycle.status === "CLOSING",
              )

              .flatMap((cycle) => cycle.kpiForms.map((form) => form.id)),
          ),
        );
      } catch {
        setActiveCycleTemplateIds(new Set());

        toast.error("Could not load active KPI Template Cycle status.");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load templates.";

      setError(message);

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const list = [...templates].sort((a, b) =>
      (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
    );

    return list.filter((template) => {
      const matchesStatus =
        statusFilter === "" || template.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!q) {
        return true;
      }

      const positionText = formatTemplatePositionLabels(
        template.positions,
      ).toLowerCase();

      return (
        template.title.toLowerCase().includes(q) || positionText.includes(q)
      );
    });
  }, [query, statusFilter, templates]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const currentPage = Math.min(page, totalPages);

  const paginatedTemplates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;

    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const rangeStart =
    filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;

  const rangeEnd = Math.min(currentPage * pageSize, filtered.length);

  const hasActiveFilters = query.trim() !== "" || statusFilter !== "";

  const clearFilters = () => {
    setQuery("");

    setStatusFilter("");
  };

  const handleArchiveConfirm = async () => {
    if (!templateToArchive) {
      return;
    }

    try {
      setArchiving(true);

      await kpiTemplateService.deleteTemplate(templateToArchive.id);

      toast.success("Template archived.");

      setTemplateToArchive(null);

      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setArchiving(false);
    }
  };

  const handleArchiveCancel = () => {
    if (archiving) {
      return;
    }

    setTemplateToArchive(null);
  };

  return (
    <div
      className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-700"
      style={{ fontFamily: '"Times New Roman", Times, serif' }}
    >
      <div className="mx-auto max-w-6xl px-4 py-6 pb-16">
        <header className="rounded-xl border border-slate-200 bg-[radial-gradient(circle_at_92%_16%,rgba(37,99,235,0.1),transparent_14rem),linear-gradient(135deg,#ffffff_0%,#eff6ff_100%)] px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <span className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.05em] text-blue-700">
                <i className="bi bi-ui-checks-grid text-sm" aria-hidden />
                KPI Management
              </span>

              <h1 className="text-2xl font-bold leading-tight text-slate-950">
                KPI templates
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Define KPI rows per position. Managers enter actuals and scores
                later; employees view completed forms.
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              {!loading && (
                <div className="shrink-0 rounded-lg border border-slate-200 bg-white/80 px-4 py-2 text-center shadow-sm">
                  <strong className="block text-2xl font-bold tabular-nums leading-none text-slate-950">
                    {filtered.length}
                  </strong>

                  <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {hasActiveFilters && filtered.length !== templates.length
                      ? `of ${templates.length}`
                      : "Templates"}
                  </span>
                </div>
              )}

              <Link to="/hr/kpi-template/new" className={btnPrimary}>
                <i className="bi bi-plus-lg text-lg" aria-hidden />
                New template
              </Link>
            </div>
          </div>
        </header>

        <section
          className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          aria-label="KPI template filters"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Filters
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-bold text-blue-700 underline-offset-2 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)_auto_auto]">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Search
              <div className="relative">
                <i
                  className="bi bi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400"
                  aria-hidden
                />

                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Title or position…"
                  className={`${inputClass} w-full pl-9`}
                  aria-label="Search templates"
                />
              </div>
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Status
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as KpiFormStatus | "")
                }
                className={inputClass}
                aria-label="Filter by status"
              >
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-slate-700 sm:col-span-2 lg:col-span-1">
              Rows per page
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className={`${inputClass} w-full lg:min-w-[120px]`}
                aria-label="Rows per page"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className={`${btnSecondary} w-full justify-center`}
              >
                <i
                  className="bi bi-arrow-clockwise text-base text-slate-400"
                  aria-hidden
                />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {loading && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
            <span className="animate-pulse">Loading templates…</span>
          </div>
        )}

        {error && !loading && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <i
              className="bi bi-exclamation-triangle grid h-10 w-10 place-items-center rounded-lg bg-red-100 text-xl text-red-700"
              aria-hidden
            />

            <div>
              <strong className="block text-slate-950">
                Could not load templates
              </strong>

              <p className="mt-1 text-sm text-red-800">{error}</p>

              <button
                type="button"
                onClick={() => void load()}
                className="mt-3 text-sm font-bold text-red-800 underline-offset-2 hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
            <i
              className="bi bi-ui-checks-grid mb-4 grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-2xl text-blue-700"
              aria-hidden
            />

            <h2 className="text-xl font-bold text-slate-950">
              {templates.length === 0
                ? "No templates yet"
                : "No matching templates"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {templates.length === 0
                ? "Create a KPI template and link it to a position. One template per position."
                : "Try adjusting your search or status filter."}
            </p>

            {templates.length === 0 ? (
              <Link to="/hr/kpi-template/new" className={`${btnPrimary} mt-6`}>
                <i className="bi bi-plus-circle text-lg" aria-hidden />
                Create template
              </Link>
            ) : (
              hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className={`${btnSecondary} mt-6`}
                >
                  Clear filters
                </button>
              )
            )}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-1 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-bold text-slate-950">
                Template list
              </h2>

              <p className="text-xs font-semibold text-slate-500">
                Click a row to view details · {filtered.length} template
                {filtered.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/90 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="w-14 px-4 py-3 text-center">No.</th>

                    <th className="px-4 py-3">Template</th>

                    <th className="px-4 py-3">Position</th>

                    <th className="px-4 py-3">Status</th>

                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedTemplates.map((template, index) => {
                    const lockedByActiveCycle = activeCycleTemplateIds.has(
                      template.id,
                    );

                    return (
                      <tr
                        key={template.id}
                        tabIndex={0}
                        role="button"
                        onClick={() => setViewTemplateId(template.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();

                            setViewTemplateId(template.id);
                          }
                        }}
                        className={`cursor-pointer transition hover:bg-blue-50/60 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                          index % 2 === 1 ? "bg-slate-50/40" : ""
                        }`}
                      >
                        <td className="px-4 py-3 text-center tabular-nums text-slate-600">
                          {rangeStart + index}
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-950">
                            {template.title}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            Version {template.version ?? 1}
                          </p>
                        </td>

                        <td className="max-w-[240px] px-4 py-3 text-slate-700">
                          <span
                            className="line-clamp-2"
                            title={formatTemplatePositionLabels(
                              template.positions,
                            )}
                          >
                            {formatTemplatePositionLabels(template.positions)}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={kpiStatusBadgeClass(template.status)}
                          >
                            {template.status}
                          </span>

                          {lockedByActiveCycle && (
                            <p className="mt-1 text-xs font-semibold text-amber-700">
                              In active cycle
                            </p>
                          )}
                        </td>

                        <td
                          className="px-4 py-3"
                          onClick={stopRowOpen}
                          onKeyDown={stopRowOpen}
                        >
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewTemplateId(template.id)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-300 hover:bg-white hover:text-blue-700"
                              title="View detail"
                              aria-label="View detail"
                            >
                              <i className="bi bi-eye text-base" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (!lockedByActiveCycle) {
                                  navigate(
                                    `/hr/kpi-template/${template.id}/edit`,
                                  );
                                }
                              }}
                              disabled={lockedByActiveCycle}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-300 hover:bg-white hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                              title={
                                lockedByActiveCycle
                                  ? "Template is active in a KPI Template Cycle"
                                  : "Edit"
                              }
                              aria-label="Edit"
                            >
                              <i className="bi bi-pencil-square text-base" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (!lockedByActiveCycle) {
                                  setTemplateToArchive(template);
                                }
                              }}
                              disabled={lockedByActiveCycle}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-red-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                              title={
                                lockedByActiveCycle
                                  ? "Template is active in a KPI Template Cycle"
                                  : "Archive"
                              }
                              aria-label="Archive"
                            >
                              <i className="bi bi-trash text-base" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                Showing <strong className="text-slate-900">{rangeStart}</strong>
                –<strong className="text-slate-900">{rangeEnd}</strong> of{" "}
                <strong className="text-slate-900">{filtered.length}</strong>
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                <span className="px-2 text-sm font-semibold text-slate-700">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      <KpiTemplateViewModal
        open={viewTemplateId != null}
        templateId={viewTemplateId}
        onClose={() => setViewTemplateId(null)}
      />

      <ConfirmModal
        open={templateToArchive !== null}
        title="Archive KPI template"
        message={`This will soft delete "${templateToArchive?.title ?? ""}" by marking it as archived. It will remain in records but cannot be used in KPI template cycles.`}
        confirmText="Archive"
        cancelText="Cancel"
        loading={archiving}
        onConfirm={() => void handleArchiveConfirm()}
        onCancel={handleArchiveCancel}
      />
    </div>
  );
};

export default KpiTemplateListPage;
