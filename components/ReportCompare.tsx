"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { PropertyMapImage } from "@/components/PropertyMapImage";
import type { AreaStats } from "@/lib/area-stats";
import { fetchAreaStats } from "@/lib/area-stats";
import { getReportMapCoords } from "@/lib/maps";
import { propertyTypeLabel } from "@/lib/property-type";
import { fetchSavedReports, formatReportDate, type SavedReport } from "@/lib/reports";

const fmt$ = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const fmtSigned$ = (n: number) =>
  (n < 0 ? "-$" : "$") + Math.round(Math.abs(n)).toLocaleString("en-US");

type CompareMetric = {
  id: string;
  label: string;
  getValue: (report: SavedReport) => string;
  getRaw?: (report: SavedReport) => number | null;
  higherIsBetter?: boolean;
};

type AreaMetric = {
  id: string;
  label: string;
  getValue: (stats: AreaStats) => string;
  getRaw?: (stats: AreaStats) => number | null;
  higherIsBetter?: boolean;
};

type AreaStatsState = {
  status: "loading" | "done" | "error" | "missing";
  stats?: AreaStats;
  error?: string;
};

const HIGHLIGHT_METRICS: CompareMetric[] = [
  {
    id: "cashFlow",
    label: "Monthly cash flow",
    getValue: (r) => (r.analysis ? fmtSigned$(r.analysis.cashFlowMonthly) : "—"),
    getRaw: (r) => r.analysis?.cashFlowMonthly ?? null,
    higherIsBetter: true,
  },
  {
    id: "cashOnCash",
    label: "Cash-on-cash",
    getValue: (r) => (r.analysis ? `${r.analysis.cashOnCash.toFixed(2)}%` : "—"),
    getRaw: (r) => r.analysis?.cashOnCash ?? null,
    higherIsBetter: true,
  },
  {
    id: "capRate",
    label: "Cap rate",
    getValue: (r) => (r.analysis ? `${r.analysis.capRate.toFixed(2)}%` : "—"),
    getRaw: (r) => r.analysis?.capRate ?? null,
    higherIsBetter: true,
  },
];

const DEAL_GROUPS: { title: string; metricIds: string[] }[] = [
  { title: "Returns", metricIds: ["rent", "cashFlowAnnual", "onePercent"] },
  { title: "Investment & costs", metricIds: ["price", "cashInvested", "expenses"] },
];

const ALL_DEAL_METRICS: CompareMetric[] = [
  {
    id: "rent",
    label: "Monthly rent",
    getValue: (r) => (r.analysis ? fmt$(r.analysis.rent) : "—"),
    getRaw: (r) => r.analysis?.rent ?? null,
    higherIsBetter: true,
  },
  {
    id: "cashFlowAnnual",
    label: "Annual cash flow",
    getValue: (r) => (r.analysis ? fmtSigned$(r.analysis.cashFlowAnnual) : "—"),
    getRaw: (r) => r.analysis?.cashFlowAnnual ?? null,
    higherIsBetter: true,
  },
  {
    id: "onePercent",
    label: "1% rule",
    getValue: (r) => (r.analysis ? `${r.analysis.onePercentRatio.toFixed(2)}%` : "—"),
    getRaw: (r) => r.analysis?.onePercentRatio ?? null,
    higherIsBetter: true,
  },
  {
    id: "price",
    label: "Purchase price",
    getValue: (r) => (r.form.price ? fmt$(Number(r.form.price)) : "—"),
    getRaw: (r) => (r.form.price ? Number(r.form.price) : null),
    higherIsBetter: false,
  },
  {
    id: "cashInvested",
    label: "Cash invested",
    getValue: (r) => (r.analysis ? fmt$(r.analysis.cashInvested) : "—"),
    getRaw: (r) => r.analysis?.cashInvested ?? null,
    higherIsBetter: false,
  },
  {
    id: "expenses",
    label: "Monthly expenses",
    getValue: (r) => (r.analysis ? fmt$(r.analysis.totalExpensesMonthly) : "—"),
    getRaw: (r) => r.analysis?.totalExpensesMonthly ?? null,
    higherIsBetter: false,
  },
];

const AREA_METRICS: AreaMetric[] = [
  {
    id: "crime",
    label: "Crime / safety",
    getValue: (s) => s.crime_grade,
    getRaw: (s) => s.crime_index,
    higherIsBetter: false,
  },
  {
    id: "schools",
    label: "School rating",
    getValue: (s) =>
      s.school_rating != null ? `${s.school_rating.toFixed(1)} / 10` : "—",
    getRaw: (s) => s.school_rating,
    higherIsBetter: true,
  },
  {
    id: "walk",
    label: "Walk score",
    getValue: (s) => (s.walk_score != null ? `${s.walk_score} / 100` : "—"),
    getRaw: (s) => s.walk_score,
    higherIsBetter: true,
  },
  {
    id: "income",
    label: "Median income",
    getValue: (s) => (s.median_income != null ? fmt$(s.median_income) : "—"),
    getRaw: (s) => s.median_income,
    higherIsBetter: true,
  },
];

function bestIndex(values: (number | null)[], higherIsBetter: boolean): number | null {
  const ranked = values
    .map((value, index) => ({ value, index }))
    .filter((entry): entry is { value: number; index: number } => entry.value !== null);
  if (ranked.length < 2) return null;

  ranked.sort((a, b) => (higherIsBetter ? b.value - a.value : a.value - b.value));
  const best = ranked[0].value;
  const ties = ranked.filter((entry) => entry.value === best);
  return ties.length === 1 ? ties[0].index : null;
}

function verdictClass(verdict?: string): string {
  if (verdict === "Approved") return "approved";
  if (verdict === "Marginal") return "marginal";
  if (verdict === "Pass") return "pass";
  return "";
}

function MetricRow({
  label,
  value,
  isBest,
}: {
  label: string;
  value: string;
  isBest?: boolean;
}) {
  return (
    <div className={`compare-metric-row${isBest ? " is-best" : ""}`}>
      <span className="compare-metric-label">{label}</span>
      <span className="compare-metric-value">
        {value}
        {isBest ? <span className="compare-best-badge">Best</span> : null}
      </span>
    </div>
  );
}

function CompareDealCard({
  report,
  reportIndex,
  comparableReports,
  areaState,
  areaStatsByReport,
}: {
  report: SavedReport;
  reportIndex: number;
  comparableReports: SavedReport[];
  areaState?: AreaStatsState;
  areaStatsByReport: Record<string, AreaStatsState>;
}) {
  const coords = getReportMapCoords(report);
  const verified = report.form.verifiedAddress;
  const verdict = report.analysis?.verdict;
  const verdictCls = verdictClass(verdict);

  function isBestDealMetric(metric: CompareMetric): boolean {
    if (!metric.getRaw || metric.higherIsBetter === undefined) return false;
    const rawValues = comparableReports.map((r) => metric.getRaw!(r));
    return bestIndex(rawValues, metric.higherIsBetter) === reportIndex;
  }

  function isBestAreaMetric(metric: AreaMetric): boolean {
    if (!metric.getRaw || metric.higherIsBetter === undefined) return false;
    const rawValues = comparableReports.map((r) => {
      const state = areaStatsByReport[r.id];
      if (!state?.stats) return null;
      return metric.getRaw!(state.stats);
    });
    return bestIndex(rawValues, metric.higherIsBetter) === reportIndex;
  }

  return (
    <article className="compare-deal-card">
      <header className="compare-deal-header">
        {coords ? (
          <PropertyMapImage
            lat={coords.lat}
            lon={coords.lon}
            alt={`Map for ${report.name}`}
            className="compare-deal-map"
            variant="full"
          />
        ) : (
          <div className="property-map-placeholder compare-deal-map">No map</div>
        )}
        <div className="compare-deal-header-text">
          <h3 className="compare-deal-title">{report.form.address?.split(",")[0] || report.name}</h3>
          <p className="compare-deal-sub">
            {verified?.city && verified?.postcode
              ? `${verified.city}, ZIP ${verified.postcode}`
              : report.form.address || "No address"}
          </p>
          <p className="compare-deal-meta">
            {propertyTypeLabel(report.form.propertyType)}
            {report.form.price ? ` · ${fmt$(Number(report.form.price))}` : ""}
          </p>
          {verdict ? (
            <span className={`compare-verdict-pill ${verdictCls}`}>{verdict}</span>
          ) : null}
        </div>
      </header>

      <div className="compare-highlights">
        {HIGHLIGHT_METRICS.map((metric) => (
          <div
            key={metric.id}
            className={`compare-highlight${isBestDealMetric(metric) ? " is-best" : ""}`}
          >
            <span className="compare-highlight-label">{metric.label}</span>
            <span className="compare-highlight-value">{metric.getValue(report)}</span>
          </div>
        ))}
      </div>

      {DEAL_GROUPS.map((group) => {
        const metrics = ALL_DEAL_METRICS.filter((m) => group.metricIds.includes(m.id));
        return (
          <section key={group.title} className="compare-section">
            <h4 className="compare-section-title">{group.title}</h4>
            {metrics.map((metric) => (
              <MetricRow
                key={metric.id}
                label={metric.label}
                value={metric.getValue(report)}
                isBest={isBestDealMetric(metric)}
              />
            ))}
          </section>
        );
      })}

      <section className="compare-section compare-section-area">
        <h4 className="compare-section-title">Neighborhood</h4>
        {areaState?.status === "loading" || !areaState ? (
          <p className="compare-area-loading">Loading area data…</p>
        ) : areaState.status === "missing" ? (
          <p className="compare-area-muted">Needs verified address on worksheet</p>
        ) : areaState.status === "error" ? (
          <p className="compare-area-muted">{areaState.error || "Could not load area data"}</p>
        ) : areaState.stats ? (
          <>
            {AREA_METRICS.map((metric) => (
              <MetricRow
                key={metric.id}
                label={metric.label}
                value={metric.getValue(areaState.stats!)}
                isBest={isBestAreaMetric(metric)}
              />
            ))}
            {areaState.stats.school_summary ? (
              <p className="compare-school-note">{areaState.stats.school_summary}</p>
            ) : null}
            {areaState.stats.source === "fallback" ? (
              <p className="compare-area-est">State-level estimates (live ZIP data unavailable)</p>
            ) : null}
          </>
        ) : null}
      </section>
    </article>
  );
}

export function ReportCompare() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [areaStatsByReport, setAreaStatsByReport] = useState<Record<string, AreaStatsState>>({});
  const [pickerOpen, setPickerOpen] = useState(true);

  useEffect(() => {
    fetchSavedReports()
      .then(setReports)
      .catch(() => {
        /* fetchSavedReports already falls back to localStorage */
      });
  }, []);

  const selectedReports = useMemo(
    () => reports.filter((r) => selectedIds.includes(r.id)),
    [reports, selectedIds]
  );

  const comparableReports = useMemo(
    () => selectedReports.filter((r) => r.analysis),
    [selectedReports]
  );

  const comparableReportKey = useMemo(
    () => comparableReports.map((r) => r.id).sort().join("|"),
    [comparableReports]
  );

  const areaStatsInflightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (comparableReports.length < 2) return;

    const activeIds = new Set(comparableReports.map((r) => r.id));
    for (const id of areaStatsInflightRef.current) {
      if (!activeIds.has(id)) areaStatsInflightRef.current.delete(id);
    }

    comparableReports.forEach((report) => {
      if (areaStatsInflightRef.current.has(report.id)) return;

      const verified = report.form.verifiedAddress;
      if (!verified?.postcode) {
        areaStatsInflightRef.current.add(report.id);
        setAreaStatsByReport((current) => ({
          ...current,
          [report.id]: { status: "missing" },
        }));
        return;
      }

      areaStatsInflightRef.current.add(report.id);
      setAreaStatsByReport((current) => ({
        ...current,
        [report.id]: { status: "loading" },
      }));

      void fetchAreaStats({
        address: verified.label || report.form.address,
        zip: verified.postcode,
        state: verified.state,
        city: verified.city,
      })
        .then((stats) => {
          setAreaStatsByReport((prev) => ({
            ...prev,
            [report.id]: { status: "done", stats },
          }));
        })
        .catch((error: unknown) => {
          setAreaStatsByReport((prev) => ({
            ...prev,
            [report.id]: {
              status: "error",
              error: error instanceof Error ? error.message : "Failed to load",
            },
          }));
        });
    });
  }, [comparableReportKey, comparableReports]);

  function toggleReport(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  }

  const canCompare = comparableReports.length >= 2;

  return (
    <>
      <div className="titleblock">
        <div className="eyebrow">Form RE-1 · Compare</div>
        <h1>Compare deals</h1>
        <div className="sub">
          Pick two or more saved reports to see returns, costs, and neighborhood data side by side.
        </div>
      </div>

      <main>
        {reports.length === 0 ? (
          <div className="sheet">
            <div className="compare-empty">
              No saved reports yet.{" "}
              <Link href="/">Run an analysis on the worksheet</Link> and save a report first.
            </div>
          </div>
        ) : (
          <>
            <div className="sheet compare-picker-sheet">
              <button
                type="button"
                className="compare-picker-toggle"
                onClick={() => setPickerOpen((o) => !o)}
                aria-expanded={pickerOpen}
              >
                <span>
                  <strong>{selectedIds.length}</strong> of {reports.length} reports selected
                </span>
                <span className="compare-picker-toggle-hint">
                  {canCompare ? "Comparing " + comparableReports.length + " deals" : "Select at least 2"}
                </span>
                <span className="compare-picker-chevron">{pickerOpen ? "▲" : "▼"}</span>
              </button>

              {pickerOpen ? (
                <div className="compare-select-grid">
                  {reports.map((report) => {
                    const checked = selectedIds.includes(report.id);
                    const hasAnalysis = Boolean(report.analysis);
                    const coords = getReportMapCoords(report);
                    return (
                      <button
                        key={report.id}
                        type="button"
                        className={`compare-select-chip${checked ? " active" : ""}${!hasAnalysis ? " no-analysis" : ""}`}
                        onClick={() => toggleReport(report.id)}
                        aria-pressed={checked}
                      >
                        {coords ? (
                          <PropertyMapImage
                            lat={coords.lat}
                            lon={coords.lon}
                            alt=""
                            className="compare-chip-thumb"
                            variant="thumb"
                          />
                        ) : (
                          <div className="property-map-placeholder compare-chip-thumb" />
                        )}
                        <span className="compare-chip-body">
                          <span className="compare-chip-name">{report.name}</span>
                          <span className="compare-chip-meta">
                            {hasAnalysis ? report.analysis!.verdict : "No analysis"}
                            {" · "}
                            {formatReportDate(report.updatedAt)}
                          </span>
                        </span>
                        <span className="compare-chip-check" aria-hidden>{checked ? "✓" : ""}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {!canCompare ? (
              <div className="compare-hint">
                {selectedIds.length < 2
                  ? "Select at least 2 reports to compare."
                  : "At least 2 selected reports need a completed analysis. "}
                {selectedIds.length >= 2 && comparableReports.length < 2 ? (
                  <Link href="/">Run analysis on the worksheet</Link>
                ) : null}
              </div>
            ) : (
              <div className="compare-results">
                <div className="compare-results-head">
                  <h2>Side-by-side comparison</h2>
                  <p className="compare-results-note">
                    Green highlights show the best value per metric when there is a clear winner.
                  </p>
                </div>
                <div className="compare-deal-grid">
                  {comparableReports.map((report, index) => (
                    <CompareDealCard
                      key={report.id}
                      report={report}
                      reportIndex={index}
                      comparableReports={comparableReports}
                      areaState={areaStatsByReport[report.id]}
                      areaStatsByReport={areaStatsByReport}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
