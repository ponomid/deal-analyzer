"use client";

import { FormEvent, useCallback, useEffect, useState, type ReactNode } from "react";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { PropertyMapImage } from "@/components/PropertyMapImage";
import { SavedReportsPanel } from "@/components/SavedReportsPanel";
import {
  projectAppreciation,
  type AppreciationEstimate,
} from "@/lib/appreciation";
import { buildFallbackOperatingEstimates } from "@/lib/operating-defaults";
import type { AddressSuggestion } from "@/lib/address";
import {
  createReportId,
  defaultReportName,
  deleteReportFromServer,
  fetchSavedReports,
  type ReportAnalysis,
  type ReportFormState,
  saveReportToServer,
  type SavedReport,
} from "@/lib/reports";
import {
  fixedUnitCount,
  isMultiUnitProperty,
  PROPERTY_TYPE_LABELS,
  type PropertyType,
} from "@/lib/property-type";
import type { OperatingEstimates, RentEstimate } from "@/lib/types";

const fmt$ = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const fmtSigned$ = (n: number) =>
  (n < 0 ? "-$" : "$") + Math.round(Math.abs(n)).toLocaleString("en-US");

function parseNum(value: string, fallback = 0) {
  const v = parseFloat(value);
  return Number.isNaN(v) ? fallback : v;
}

function parseOptional(value: string) {
  const v = parseFloat(value);
  return Number.isNaN(v) ? null : v;
}

function monthlyPI(loanAmount: number, annualRatePct: number, termYears: number) {
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return loanAmount / n;
  return (loanAmount * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
}

type Analysis = ReportAnalysis;

const FINANCING_DEFAULTS = {
  down: 20,
  rate: 7,
  term: 30,
  closing: 2,
};

type FinancingMode = "default" | "custom";
type OperatingMode = "default" | "custom";

type UnitForm = {
  id: string;
  label: string;
  beds: string;
  baths: string;
  sqft: string;
};

function newUnit(index: number): UnitForm {
  return {
    id: `unit-${index}-${Math.random().toString(36).slice(2, 9)}`,
    label: "",
    beds: "",
    baths: "",
    sqft: "",
  };
}

function unitHasData(unit: UnitForm) {
  return unit.label.trim() || unit.beds.trim() || unit.baths.trim() || unit.sqft.trim();
}

function ensureUnitsForPropertyType(type: PropertyType, current: UnitForm[]): UnitForm[] {
  const fixed = fixedUnitCount(type);
  if (type === "single_family") return current;

  if (fixed !== null) {
    const next = [...current];
    while (next.length < fixed) next.push(newUnit(next.length));
    return next.slice(0, fixed);
  }

  const next = [...current];
  while (next.length < 2) next.push(newUnit(next.length));
  return next;
}

export function DealAnalyzer() {
  const [address, setAddress] = useState("");
  const [verifiedAddress, setVerifiedAddress] = useState<AddressSuggestion | null>(null);
  const [propertyType, setPropertyType] = useState<PropertyType>("single_family");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [units, setUnits] = useState<UnitForm[]>(() => [newUnit(0), newUnit(1)]);
  const [price, setPrice] = useState("");
  const [financingMode, setFinancingMode] = useState<FinancingMode>("default");
  const [operatingMode, setOperatingMode] = useState<OperatingMode>("default");
  const [operatingEstimates, setOperatingEstimates] = useState<OperatingEstimates | null>(null);
  const [down, setDown] = useState("");
  const [rate, setRate] = useState("");
  const [term, setTerm] = useState("");
  const [closing, setClosing] = useState("");
  const [tax, setTax] = useState("");
  const [insurance, setInsurance] = useState("");
  const [hoa, setHoa] = useState("");
  const [maint, setMaint] = useState("");
  const [vacancy, setVacancy] = useState("");
  const [mgmt, setMgmt] = useState("");
  const [rentOverride, setRentOverride] = useState("");

  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [reportName, setReportName] = useState("");

  useEffect(() => {
    fetchSavedReports()
      .then(setSavedReports)
      .catch(() => {
        /* fetchSavedReports already falls back to localStorage */
      });
  }, []);

  function handlePropertyTypeChange(type: PropertyType) {
    setPropertyType(type);
    setUnits((current) => ensureUnitsForPropertyType(type, current));
  }

  function buildFormSnapshot(): ReportFormState {
    return {
      address,
      verifiedAddress,
      propertyType,
      beds,
      baths,
      sqft,
      units,
      price,
      financingMode,
      operatingMode,
      operatingEstimates,
      down,
      rate,
      term,
      closing,
      tax,
      insurance,
      hoa,
      maint,
      vacancy,
      mgmt,
      rentOverride,
    };
  }

  function loadReport(report: SavedReport) {
    const f = report.form;
    setActiveReportId(report.id);
    setReportName(report.name);
    setAddress(f.address);
    setVerifiedAddress(f.verifiedAddress);
    setPropertyType(f.propertyType);
    setBeds(f.beds);
    setBaths(f.baths);
    setSqft(f.sqft);
    setUnits(ensureUnitsForPropertyType(f.propertyType, f.units.length > 0 ? f.units : [newUnit(0), newUnit(1)]));
    setPrice(f.price);
    setFinancingMode(f.financingMode);
    setOperatingMode(f.operatingMode);
    setOperatingEstimates(f.operatingEstimates);
    setDown(f.down);
    setRate(f.rate);
    setTerm(f.term);
    setClosing(f.closing);
    setTax(f.tax);
    setInsurance(f.insurance);
    setHoa(f.hoa);
    setMaint(f.maint);
    setVacancy(f.vacancy);
    setMgmt(f.mgmt);
    setRentOverride(f.rentOverride);
    setAnalysis(report.analysis);
    setError("");
    setStatus("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startNewReport() {
    setActiveReportId(null);
    setReportName("");
    setAddress("");
    setVerifiedAddress(null);
    setPropertyType("single_family");
    setBeds("");
    setBaths("");
    setSqft("");
    setUnits([newUnit(0), newUnit(1)]);
    setPrice("");
    setFinancingMode("default");
    setOperatingMode("default");
    setOperatingEstimates(null);
    setDown("");
    setRate("");
    setTerm("");
    setClosing("");
    setTax("");
    setInsurance("");
    setHoa("");
    setMaint("");
    setVacancy("");
    setMgmt("");
    setRentOverride("");
    setAnalysis(null);
    setError("");
    setStatus("");
  }

  async function saveReport() {
    const now = new Date().toISOString();
    const name = reportName.trim() || defaultReportName(address, price);
    const id = activeReportId ?? createReportId();
    const existing = savedReports.find((r) => r.id === id);
    const report: SavedReport = {
      id,
      name,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      form: buildFormSnapshot(),
      analysis,
    };

    try {
      const next = await saveReportToServer(report);
      setSavedReports(next);
      setActiveReportId(id);
      setReportName(name);
    } catch {
      setError("Could not save report. Try again.");
    }
  }

  async function handleDeleteReport(id: string) {
    try {
      const next = await deleteReportFromServer(id);
      setSavedReports(next);
      if (activeReportId === id) startNewReport();
    } catch {
      setError("Could not delete report. Try again.");
    }
  }

  const fetchOperatingEstimates = useCallback(async (): Promise<OperatingEstimates> => {
    const purchasePrice = parseNum(price, 0);
    if (purchasePrice <= 0) {
      throw new Error("Enter a purchase price to load operating estimates.");
    }

    if (verifiedAddress?.postcode) {
      const response = await fetch("/api/operating-estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: verifiedAddress.label,
          zip: verifiedAddress.postcode,
          state: verifiedAddress.state,
          city: verifiedAddress.city,
          purchasePrice,
        }),
      });
      const payload = await response.json();
      if (response.ok) {
        const estimates = payload as OperatingEstimates;
        setOperatingEstimates(estimates);
        return estimates;
      }
    }

    const fallback = buildFallbackOperatingEstimates(
      purchasePrice,
      verifiedAddress?.state,
      verifiedAddress?.postcode
    );
    setOperatingEstimates(fallback);
    return fallback;
  }, [price, verifiedAddress]);

  useEffect(() => {
    setOperatingEstimates(null);
  }, [verifiedAddress, price]);

  async function onRun(e: FormEvent) {
    e.preventDefault();
    setError("");
    setAnalysis(null);

    const override = parseNum(rentOverride, 0);
    const purchasePrice = parseNum(price, 0);

    if (!address.trim() && !override) {
      setError("Enter a property address (or a manual rent override) before running the analysis.");
      return;
    }
    if (address.trim() && !override && !verifiedAddress) {
      setError("Select a verified address from the dropdown before running the analysis.");
      return;
    }
    if (!purchasePrice) {
      setError("Enter a purchase price.");
      return;
    }
    if (operatingMode === "default" && !verifiedAddress?.postcode) {
      setError("Select a verified address so we can load tax and insurance for your ZIP.");
      return;
    }
    if (isMultiUnitProperty(propertyType) && !units.some(unitHasData)) {
      setError(`Add unit details (beds, baths, or sqft) for ${PROPERTY_TYPE_LABELS[propertyType].toLowerCase()} analysis.`);
      return;
    }

    setRunning(true);
    setStatus(
      override
        ? operatingMode === "default"
          ? "Loading operating estimates…"
          : "Calculating…"
        : operatingMode === "default"
          ? "Loading estimates and searching comparable rentals…"
          : "Searching for comparable rentals…"
    );

    try {
      let operating: OperatingEstimates;
      if (operatingMode === "default") {
        operating = await fetchOperatingEstimates();
      } else {
        operating = {
          property_tax_annual: parseNum(tax, 0),
          insurance_annual: parseNum(insurance, 0),
          hoa_monthly: parseNum(hoa, 0),
          maintenance_pct: parseNum(maint, 5),
          vacancy_pct: parseNum(vacancy, 5),
          management_pct: parseNum(mgmt, 0),
          notes: "",
          source: "fallback",
        };
      }

      if (!override) {
        setStatus("Searching for comparable rentals…");
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: verifiedAddress?.label || address.trim(),
          propertyType,
          override,
          ...(isMultiUnitProperty(propertyType)
            ? {
                units: units
                  .filter(unitHasData)
                  .map((unit, index) => ({
                    label: unit.label.trim() || `Unit ${index + 1}`,
                    beds: parseOptional(unit.beds),
                    baths: parseOptional(unit.baths),
                    sqft: parseOptional(unit.sqft),
                  })),
              }
            : {
                beds: parseOptional(beds),
                baths: parseOptional(baths),
                sqft: parseOptional(sqft),
              }),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || `Search request failed (${response.status})`);
      }

      const rentData = payload as RentEstimate;
      const rent = rentData.estimated_rent || 0;
      const downPct =
        financingMode === "default"
          ? FINANCING_DEFAULTS.down
          : parseNum(down, FINANCING_DEFAULTS.down);
      const ratePct =
        financingMode === "default"
          ? FINANCING_DEFAULTS.rate
          : parseNum(rate, FINANCING_DEFAULTS.rate);
      const termYrs =
        financingMode === "default"
          ? FINANCING_DEFAULTS.term
          : parseNum(term, FINANCING_DEFAULTS.term);
      const closingPct =
        financingMode === "default"
          ? FINANCING_DEFAULTS.closing
          : parseNum(closing, FINANCING_DEFAULTS.closing);
      const taxAnnual = operating.property_tax_annual;
      const insAnnual = operating.insurance_annual;
      const hoaMonthly = operating.hoa_monthly;
      const maintPct = operating.maintenance_pct;
      const vacancyPct = operating.vacancy_pct;
      const mgmtPct = operating.management_pct;

      const loanAmount = purchasePrice * (1 - downPct / 100);
      const downPaymentDollars = purchasePrice * (downPct / 100);
      const closingDollars = purchasePrice * (closingPct / 100);
      const pi = monthlyPI(loanAmount, ratePct, termYrs);
      const taxMonthly = taxAnnual / 12;
      const insMonthly = insAnnual / 12;
      const maintMonthly = rent * (maintPct / 100);
      const vacancyMonthly = rent * (vacancyPct / 100);
      const mgmtMonthly = rent * (mgmtPct / 100);

      const operatingExpensesMonthly =
        taxMonthly + insMonthly + hoaMonthly + maintMonthly + vacancyMonthly + mgmtMonthly;
      const totalExpensesMonthly = operatingExpensesMonthly + pi;
      const cashFlowMonthly = rent - totalExpensesMonthly;
      const cashFlowAnnual = cashFlowMonthly * 12;
      const noiAnnual = rent * 12 - operatingExpensesMonthly * 12;
      const capRate = purchasePrice > 0 ? (noiAnnual / purchasePrice) * 100 : 0;
      const cashInvested = downPaymentDollars + closingDollars;
      const cashOnCash = cashInvested > 0 ? (cashFlowAnnual / cashInvested) * 100 : 0;
      const onePercentRatio = purchasePrice > 0 ? (rent / purchasePrice) * 100 : 0;

      let appreciation: AppreciationEstimate | null = null;
      try {
        const stateParam = verifiedAddress?.state || "";
        if (stateParam) {
          const appreciationResponse = await fetch(
            `/api/appreciation?state=${encodeURIComponent(stateParam)}`
          );
          if (appreciationResponse.ok) {
            appreciation = (await appreciationResponse.json()) as AppreciationEstimate;
          }
        }
      } catch {
        appreciation = null;
      }

      const appreciationProjection =
        appreciation != null
          ? projectAppreciation(purchasePrice, cashFlowAnnual, appreciation)
          : null;

      let verdict: Analysis["verdict"];
      let verdictClass: Analysis["verdictClass"];
      if (cashFlowMonthly > 200 && cashOnCash > 8) {
        verdict = "Approved";
        verdictClass = "approved";
      } else if (cashFlowMonthly >= 0) {
        verdict = "Marginal";
        verdictClass = "marginal";
      } else {
        verdict = "Pass";
        verdictClass = "pass";
      }

      setAnalysis({
        rent,
        rentData,
        pi,
        taxMonthly,
        insMonthly,
        hoaMonthly,
        maintMonthly,
        vacancyMonthly,
        mgmtMonthly,
        totalExpensesMonthly,
        cashFlowMonthly,
        cashFlowAnnual,
        capRate,
        cashInvested,
        cashOnCash,
        onePercentRatio,
        verdict,
        verdictClass,
        appreciation,
        appreciationProjection,
      });
      setStatus("");
      requestAnimationFrame(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong running the analysis.");
      setStatus("");
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <div className="titleblock">
        <div className="eyebrow">Form RE-1 · Worksheet</div>
        <h1>Analyze a rental deal</h1>
        <div className="sub">
          Enter the property, pick a verified address, set your price, and run analysis to see cash flow
          and comps.
        </div>
      </div>

      <main className="worksheet-main-wrap">
        <SavedReportsPanel
          reports={savedReports}
          activeReportId={activeReportId}
          onLoad={loadReport}
          onDelete={handleDeleteReport}
          onNew={startNewReport}
        />

        <form onSubmit={onRun} className="worksheet-form">
          <div className="worksheet-layout">
            <div className="worksheet-columns">
              <section className="worksheet-card">
                <header className="worksheet-card-head">
                  <h2>Property</h2>
                  <p>Address and unit details for rent comps</p>
                </header>

                <WorksheetField label="Address" hint="Select from dropdown to verify ZIP for tax & insurance">
                  <AddressAutocomplete
                    value={address}
                    verified={verifiedAddress}
                    onChange={(next, verified) => {
                      setAddress(next);
                      setVerifiedAddress(verified);
                    }}
                    placeholder="123 Maple St, Columbus, OH"
                  />
                </WorksheetField>

                <WorksheetField label="Property type">
                  <div className="mode-toggle property-type-grid">
                    {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={propertyType === type ? "active" : undefined}
                        onClick={() => handlePropertyTypeChange(type)}
                      >
                        {PROPERTY_TYPE_LABELS[type]}
                      </button>
                    ))}
                  </div>
                </WorksheetField>

                {!isMultiUnitProperty(propertyType) ? (
                  <WorksheetField label="Beds / baths / sqft">
                    <div className="worksheet-inline-inputs">
                      <label className="worksheet-mini-label">
                        Beds
                        <input
                          className="small"
                          value={beds}
                          onChange={(e) => setBeds(e.target.value)}
                          placeholder="3"
                          inputMode="decimal"
                        />
                      </label>
                      <label className="worksheet-mini-label">
                        Baths
                        <input
                          className="small"
                          value={baths}
                          onChange={(e) => setBaths(e.target.value)}
                          placeholder="2"
                          inputMode="decimal"
                        />
                      </label>
                      <label className="worksheet-mini-label">
                        Sqft
                        <input
                          className="small"
                          value={sqft}
                          onChange={(e) => setSqft(e.target.value)}
                          placeholder="1400"
                          inputMode="numeric"
                        />
                      </label>
                    </div>
                  </WorksheetField>
                ) : (
                  <div className="worksheet-units-block">
                    <div className="worksheet-units-head">
                      <span className="worksheet-units-title">
                        Units
                        {propertyType === "duplex"
                          ? " (2)"
                          : propertyType === "triplex"
                            ? " (3)"
                            : ""}
                      </span>
                      {propertyType === "multifamily" ? (
                        <button
                          type="button"
                          className="unit-add-btn"
                          onClick={() => setUnits((u) => [...u, newUnit(u.length)])}
                        >
                          + Add unit
                        </button>
                      ) : null}
                    </div>
                    {units.map((unit, index) => (
                      <div className="unit-row worksheet-unit-row" key={unit.id}>
                        <input
                          className="unit-label"
                          value={unit.label}
                          onChange={(e) =>
                            setUnits((prev) =>
                              prev.map((u) => (u.id === unit.id ? { ...u, label: e.target.value } : u))
                            )
                          }
                          placeholder={`Unit ${index + 1}`}
                        />
                        <div className="row3 unit-fields">
                          <input
                            className="small"
                            value={unit.beds}
                            onChange={(e) =>
                              setUnits((prev) =>
                                prev.map((u) =>
                                  u.id === unit.id ? { ...u, beds: e.target.value } : u
                                )
                              )
                            }
                            placeholder="Beds"
                            inputMode="decimal"
                            aria-label={`${unit.label || `Unit ${index + 1}`} beds`}
                          />
                          <input
                            className="small"
                            value={unit.baths}
                            onChange={(e) =>
                              setUnits((prev) =>
                                prev.map((u) =>
                                  u.id === unit.id ? { ...u, baths: e.target.value } : u
                                )
                              )
                            }
                            placeholder="Baths"
                            inputMode="decimal"
                            aria-label={`${unit.label || `Unit ${index + 1}`} baths`}
                          />
                          <input
                            className="small"
                            value={unit.sqft}
                            onChange={(e) =>
                              setUnits((prev) =>
                                prev.map((u) =>
                                  u.id === unit.id ? { ...u, sqft: e.target.value } : u
                                )
                              )
                            }
                            placeholder="Sqft"
                            inputMode="numeric"
                            aria-label={`${unit.label || `Unit ${index + 1}`} sqft`}
                          />
                        </div>
                        {propertyType === "multifamily" && units.length > 2 ? (
                          <button
                            type="button"
                            className="unit-remove-btn"
                            onClick={() => setUnits((prev) => prev.filter((u) => u.id !== unit.id))}
                            aria-label={`Remove ${unit.label || `Unit ${index + 1}`}`}
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="worksheet-card">
                <header className="worksheet-card-head">
                  <h2>Financing</h2>
                  <p>Purchase price and loan assumptions</p>
                </header>

                <WorksheetField label="Financing">
                  <div className="mode-toggle">
                    <button
                      type="button"
                      className={financingMode === "default" ? "active" : undefined}
                      onClick={() => setFinancingMode("default")}
                    >
                      Default
                    </button>
                    <button
                      type="button"
                      className={financingMode === "custom" ? "active" : undefined}
                      onClick={() => setFinancingMode("custom")}
                    >
                      Custom
                    </button>
                  </div>
                  {financingMode === "default" ? (
                    <p className="worksheet-mode-hint">
                      {FINANCING_DEFAULTS.down}% down · {FINANCING_DEFAULTS.rate}% rate ·{" "}
                      {FINANCING_DEFAULTS.term} yr · {FINANCING_DEFAULTS.closing}% closing
                    </p>
                  ) : null}
                </WorksheetField>

                <WorksheetField label="Purchase price">
                  <div className="worksheet-price-input">
                    <span className="worksheet-input-prefix">$</span>
                    <input
                      className="worksheet-price-field"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="250,000"
                      inputMode="numeric"
                    />
                  </div>
                </WorksheetField>

                {financingMode === "custom" ? (
                  <div className="worksheet-custom-grid">
                    <label className="worksheet-mini-label">
                      Down %
                      <input value={down} onChange={(e) => setDown(e.target.value)} placeholder="20" inputMode="decimal" />
                    </label>
                    <label className="worksheet-mini-label">
                      Rate %
                      <input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="6.75" inputMode="decimal" />
                    </label>
                    <label className="worksheet-mini-label">
                      Term (yrs)
                      <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="30" inputMode="numeric" />
                    </label>
                    <label className="worksheet-mini-label">
                      Closing %
                      <input value={closing} onChange={(e) => setClosing(e.target.value)} placeholder="2" inputMode="decimal" />
                    </label>
                  </div>
                ) : null}
              </section>

              <section className="worksheet-card">
                <header className="worksheet-card-head">
                  <h2>Operating costs</h2>
                  <p>Tax, insurance, and reserves</p>
                </header>

                <WorksheetField label="Assumptions">
                  <div className="mode-toggle">
                    <button
                      type="button"
                      className={operatingMode === "default" ? "active" : undefined}
                      onClick={() => setOperatingMode("default")}
                    >
                      Default
                    </button>
                    <button
                      type="button"
                      className={operatingMode === "custom" ? "active" : undefined}
                      onClick={() => setOperatingMode("custom")}
                    >
                      Custom
                    </button>
                  </div>
                  {operatingMode === "default" ? (
                    <p className="worksheet-mode-hint">
                      {operatingEstimates
                        ? `Last run: tax ${fmt$(operatingEstimates.property_tax_annual)}/yr · insurance ${fmt$(operatingEstimates.insurance_annual)}/yr · maint ${operatingEstimates.maintenance_pct}% · vacancy ${operatingEstimates.vacancy_pct}%${operatingEstimates.source === "web" ? " · web" : " · est."}`
                        : verifiedAddress?.postcode && parseNum(price, 0) > 0
                          ? "Loads from your ZIP when you run analysis"
                          : "Needs verified address + purchase price"}
                    </p>
                  ) : null}
                </WorksheetField>

                {operatingMode === "custom" ? (
                  <div className="worksheet-custom-grid worksheet-custom-grid-wide">
                    <label className="worksheet-mini-label">
                      Tax / yr
                      <input value={tax} onChange={(e) => setTax(e.target.value)} placeholder="3200" inputMode="numeric" />
                    </label>
                    <label className="worksheet-mini-label">
                      Insurance / yr
                      <input value={insurance} onChange={(e) => setInsurance(e.target.value)} placeholder="1400" inputMode="numeric" />
                    </label>
                    <label className="worksheet-mini-label">
                      HOA / mo
                      <input value={hoa} onChange={(e) => setHoa(e.target.value)} placeholder="0" inputMode="numeric" />
                    </label>
                    <label className="worksheet-mini-label">
                      Maint %
                      <input value={maint} onChange={(e) => setMaint(e.target.value)} placeholder="5" inputMode="decimal" />
                    </label>
                    <label className="worksheet-mini-label">
                      Vacancy %
                      <input value={vacancy} onChange={(e) => setVacancy(e.target.value)} placeholder="5" inputMode="decimal" />
                    </label>
                    <label className="worksheet-mini-label">
                      Mgmt %
                      <input value={mgmt} onChange={(e) => setMgmt(e.target.value)} placeholder="0" inputMode="decimal" />
                    </label>
                  </div>
                ) : null}

                <WorksheetField label="Manual rent override" hint="Leave blank to search live comps">
                  <div className="worksheet-price-input">
                    <span className="worksheet-input-prefix">$</span>
                    <input
                      className="worksheet-price-field"
                      value={rentOverride}
                      onChange={(e) => setRentOverride(e.target.value)}
                      placeholder="Optional monthly rent"
                      inputMode="numeric"
                    />
                  </div>
                </WorksheetField>
              </section>
            </div>

            <aside className="worksheet-sidebar">
              {verifiedAddress ? (
                <div className="worksheet-sidebar-map">
                  <PropertyMapImage
                    lat={verifiedAddress.lat}
                    lon={verifiedAddress.lon}
                    alt={`Map for ${verifiedAddress.label}`}
                    className="worksheet-map-preview"
                  />
                  <p className="worksheet-map-label">{verifiedAddress.label}</p>
                </div>
              ) : null}

              <div className="worksheet-actions-card">
                {activeReportId ? (
                  <div className="worksheet-editing-badge">Editing saved report</div>
                ) : null}

                <button className="run-btn worksheet-run-btn" type="submit" disabled={running}>
                  {running ? "Running analysis…" : "Run analysis"}
                </button>

                {status && running ? (
                  <p className={`status worksheet-status${running ? " blink" : ""}`}>{status}</p>
                ) : null}
                {error ? <div className="error worksheet-error">{error}</div> : null}

                <div className="worksheet-save-block">
                  <label className="worksheet-save-label" htmlFor="report-name">Report name</label>
                  <input
                    id="report-name"
                    className="report-name-input wide worksheet-save-input"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    placeholder={defaultReportName(address, price)}
                  />
                  <button type="button" className="secondary-btn worksheet-save-btn" onClick={saveReport}>
                    {activeReportId ? "Update report" : "Save report"}
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </form>

        <div className={`results ${analysis ? "show" : ""}`} id="results">
          {analysis ? (
            <>
              <div className="results-hero worksheet-card">
                {verifiedAddress ? (
                  <PropertyMapImage
                    lat={verifiedAddress.lat}
                    lon={verifiedAddress.lon}
                    alt={`Map for ${verifiedAddress.label}`}
                    className="results-hero-map"
                  />
                ) : null}
                <div className="results-hero-body">
                  <div className="results-hero-top">
                    <span className={`compare-verdict-pill ${analysis.verdictClass}`}>
                      {analysis.verdict}
                    </span>
                    <span className="results-hero-rent">{fmt$(analysis.rent)}/mo rent</span>
                  </div>
                  <div className="results-highlights">
                    <div className="results-highlight">
                      <span className="results-highlight-label">Monthly cash flow</span>
                      <span
                        className={`results-highlight-value${analysis.cashFlowMonthly < 0 ? " neg" : ""}`}
                      >
                        {fmtSigned$(analysis.cashFlowMonthly)}
                      </span>
                    </div>
                    <div className="results-highlight">
                      <span className="results-highlight-label">Cash-on-cash</span>
                      <span className="results-highlight-value">
                        {analysis.cashOnCash.toFixed(2)}%
                      </span>
                    </div>
                    <div className="results-highlight">
                      <span className="results-highlight-label">Cap rate</span>
                      <span className="results-highlight-value">
                        {analysis.capRate.toFixed(2)}%
                      </span>
                    </div>
                    {analysis.appreciation ? (
                      <div className="results-highlight">
                        <span className="results-highlight-label">Appreciation (1yr)</span>
                        <span className="results-highlight-value">
                          {analysis.appreciation.rateYoY.toFixed(1)}%
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="results-grid">
                <section className="worksheet-card results-card">
                  <header className="worksheet-card-head">
                    <h2>Rent & comps</h2>
                    <p>Live search at analysis time</p>
                  </header>
                  <div className="rent-summary results-rent-summary">
                    <div className="big">{fmt$(analysis.rent)}/mo</div>
                    <div className="range">
                      {analysis.rentData.property_type && isMultiUnitProperty(analysis.rentData.property_type)
                        ? "total building · "
                        : ""}
                      {analysis.rentData.rent_low && analysis.rentData.rent_high
                        ? `${fmt$(analysis.rentData.rent_low)} – ${fmt$(analysis.rentData.rent_high)}`
                        : "range not available"}
                    </div>
                  </div>
                  {(analysis.rentData.units || []).map((unit) => (
                    <div className="unit-rent-line" key={unit.label}>
                      <span className="unit-rent-label">{unit.label}</span>
                      <span className="unit-rent-value">
                        {fmt$(unit.estimated_rent)}/mo
                        {unit.rent_low && unit.rent_high
                          ? ` (${fmt$(unit.rent_low)} – ${fmt$(unit.rent_high)})`
                          : ""}
                      </span>
                    </div>
                  ))}
                  {(analysis.rentData.comps || []).length > 0 ? (
                    <div className="results-comps-head">Comparable listings</div>
                  ) : null}
                  {(analysis.rentData.comps || []).map((c, i) => (
                    <div className="comp" key={`${c.address || "comp"}-${i}`}>
                      <div>
                        <div className="addr">{c.address || "Comparable listing"}</div>
                        <div className="meta">
                          {c.beds ?? "?"}bd / {c.baths ?? "?"}ba · {c.sqft ?? "?"} sqft ·{" "}
                          {c.source || "web"}
                        </div>
                      </div>
                      <div className="rent">{c.rent ? fmt$(c.rent) : "—"}</div>
                    </div>
                  ))}
                  {analysis.rentData.notes ? (
                    <div className="notes">{analysis.rentData.notes}</div>
                  ) : null}
                </section>

                <div className="results-stack">
                  <section className="worksheet-card results-card">
                    <header className="worksheet-card-head">
                      <h2>Monthly expenses</h2>
                    </header>
                    <MetricLine k="Principal & interest" v={fmt$(analysis.pi)} />
                    <MetricLine k="Property tax" v={fmt$(analysis.taxMonthly)} />
                    <MetricLine k="Insurance" v={fmt$(analysis.insMonthly)} />
                    <MetricLine k="HOA" v={fmt$(analysis.hoaMonthly)} />
                    <MetricLine k="Maintenance" v={fmt$(analysis.maintMonthly)} />
                    <MetricLine k="Vacancy reserve" v={fmt$(analysis.vacancyMonthly)} />
                    <MetricLine k="Property management" v={fmt$(analysis.mgmtMonthly)} />
                    <MetricLine k="Total monthly" v={fmt$(analysis.totalExpensesMonthly)} total />
                  </section>

                  <section className="worksheet-card results-card">
                    <header className="worksheet-card-head">
                      <h2>Deal metrics</h2>
                    </header>
                    <MetricLine
                      k="Annual cash flow"
                      v={fmtSigned$(analysis.cashFlowAnnual)}
                      neg={analysis.cashFlowAnnual < 0}
                    />
                    <MetricLine k="Cash invested" v={fmt$(analysis.cashInvested)} />
                    <MetricLine k="1% rule" v={`${analysis.onePercentRatio.toFixed(2)}%`} />
                  </section>

                  {analysis.appreciation && analysis.appreciationProjection ? (
                    <section className="worksheet-card results-card">
                      <header className="worksheet-card-head">
                        <h2>Appreciation</h2>
                        <p>
                          {analysis.appreciation.geography}
                          {analysis.appreciation.asOf !== "n/a"
                            ? ` · FHFA through ${analysis.appreciation.asOf}`
                            : ""}
                        </p>
                      </header>
                      <MetricLine
                        k="Trailing 1-year HPI change"
                        v={`${analysis.appreciation.rateYoY.toFixed(2)}%`}
                      />
                      {analysis.appreciation.rate5yrAnnualized != null ? (
                        <MetricLine
                          k="5-year annualized HPI"
                          v={`${analysis.appreciation.rate5yrAnnualized.toFixed(2)}%`}
                        />
                      ) : null}
                      <MetricLine
                        k="Projected value in 1 year"
                        v={fmt$(analysis.appreciationProjection.projectedValue1yr)}
                      />
                      <MetricLine
                        k="Projected appreciation gain (1yr)"
                        v={fmtSigned$(analysis.appreciationProjection.gain1yr)}
                        neg={analysis.appreciationProjection.gain1yr < 0}
                      />
                      <MetricLine
                        k="Projected value in 5 years"
                        v={fmt$(analysis.appreciationProjection.projectedValue5yr)}
                      />
                      <MetricLine
                        k="Cash flow + appreciation (1yr)"
                        v={fmtSigned$(analysis.appreciationProjection.totalReturn1yr)}
                        neg={analysis.appreciationProjection.totalReturn1yr < 0}
                      />
                      {analysis.appreciation.notes ? (
                        <div className="notes" style={{ marginTop: 12 }}>
                          {analysis.appreciation.notes}
                        </div>
                      ) : null}
                    </section>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className="foot">
          Rent estimates come from a live web search — use as a starting point, not an appraisal.
        </div>
      </main>
    </>
  );
}

function WorksheetField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="worksheet-field">
      <div className="worksheet-field-label">
        {label}
        {hint ? <span className="worksheet-field-hint">{hint}</span> : null}
      </div>
      <div className="worksheet-field-body">{children}</div>
    </div>
  );
}

function MetricLine({
  k,
  v,
  total,
  neg,
}: {
  k: string;
  v: string;
  total?: boolean;
  neg?: boolean;
}) {
  const cls = ["metric-line", total ? "total" : "", neg ? "neg" : ""].filter(Boolean).join(" ");
  return (
    <div className={cls}>
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  );
}
