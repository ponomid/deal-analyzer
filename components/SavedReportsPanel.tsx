"use client";

import { useState } from "react";
import { PropertyMapImage } from "@/components/PropertyMapImage";
import { getReportMapCoords } from "@/lib/maps";
import type { SavedReport } from "@/lib/reports";
import { formatReportDate } from "@/lib/reports";

const fmt$ = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

type SavedReportsPanelProps = {
  reports: SavedReport[];
  activeReportId: string | null;
  onLoad: (report: SavedReport) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
};

function verdictClass(verdict?: string): string {
  if (verdict === "Approved") return "approved";
  if (verdict === "Marginal") return "marginal";
  if (verdict === "Pass") return "pass";
  return "";
}

export function SavedReportsPanel({
  reports,
  activeReportId,
  onLoad,
  onDelete,
  onNew,
}: SavedReportsPanelProps) {
  const [open, setOpen] = useState(reports.length > 0);

  return (
    <div className="sheet saved-reports worksheet-saved">
      <div className="worksheet-panel-toggle">
        <button
          type="button"
          className="worksheet-panel-toggle-btn"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span>
            <strong>Saved reports</strong>
            <span className="worksheet-panel-toggle-meta">
              {reports.length === 0
                ? "None yet"
                : `${reports.length} saved${activeReportId ? " · editing one" : ""}`}
            </span>
          </span>
          <span className="worksheet-chevron">{open ? "▲" : "▼"}</span>
        </button>
        <button type="button" className="text-btn worksheet-new-btn" onClick={onNew}>
          New
        </button>
      </div>

      {open ? (
        reports.length === 0 ? (
          <div className="saved-empty">
            Run an analysis below, then save to keep this deal for later or compare.
          </div>
        ) : (
          <ul className="saved-list">
            {reports.map((report) => {
              const active = report.id === activeReportId;
              const verdict = report.analysis?.verdict;
              const coords = getReportMapCoords(report);
              return (
                <li key={report.id} className={active ? "saved-item active" : "saved-item"}>
                  <button type="button" className="saved-load" onClick={() => onLoad(report)}>
                    {coords ? (
                      <PropertyMapImage
                        lat={coords.lat}
                        lon={coords.lon}
                        alt={`Map for ${report.name}`}
                        className="saved-thumb"
                        variant="thumb"
                      />
                    ) : (
                      <div className="property-map-placeholder saved-thumb">No map</div>
                    )}
                    <span className="saved-load-text">
                      <span className="saved-name-row">
                        <span className="saved-name">{report.name}</span>
                        {verdict ? (
                          <span className={`saved-verdict-pill ${verdictClass(verdict)}`}>
                            {verdict}
                          </span>
                        ) : null}
                      </span>
                      <span className="saved-meta">
                        {report.form.address || "No address"}
                        {report.analysis
                          ? ` · ${fmt$(report.analysis.cashFlowMonthly)}/mo cash flow`
                          : ""}
                      </span>
                      <span className="saved-date">Updated {formatReportDate(report.updatedAt)}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="saved-delete"
                    onClick={() => onDelete(report.id)}
                    aria-label={`Delete ${report.name}`}
                  >
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        )
      ) : null}
    </div>
  );
}
