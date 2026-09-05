import { NextResponse } from "next/server";
import { buildFallbackOperatingEstimates } from "@/lib/operating-defaults";
import { fetchPropertyTaxFromApiNinjas } from "@/lib/property-tax";
import type { OperatingEstimates, OperatingEstimatesRequest } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: OperatingEstimatesRequest;
  try {
    body = (await request.json()) as OperatingEstimatesRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const purchasePrice = Number(body.purchasePrice) || 0;
  if (purchasePrice <= 0) {
    return NextResponse.json({ error: "Purchase price is required" }, { status: 400 });
  }

  const address = (body.address || "").trim();
  const zip = (body.zip || "").trim();
  const state = (body.state || "").trim();
  const city = (body.city || "").trim();

  if (!address && !zip) {
    return NextResponse.json(
      { error: "A verified address with ZIP is required for default operating estimates." },
      { status: 400 }
    );
  }

  const fallback = buildFallbackOperatingEstimates(purchasePrice, state, zip);
  const noteParts: string[] = [];

  let property_tax_annual = fallback.property_tax_annual;
  let usedWebSource = false;

  const ninjasKey = process.env.API_NINJAS_API_KEY;
  if (ninjasKey) {
    const taxEstimate = await fetchPropertyTaxFromApiNinjas(
      ninjasKey,
      purchasePrice,
      zip,
      state,
      city
    );
    if (taxEstimate) {
      property_tax_annual = taxEstimate.property_tax_annual;
      usedWebSource = true;
      const county = taxEstimate.county ? `${taxEstimate.county} County` : "local";
      noteParts.push(
        `Property tax via API Ninjas: ${taxEstimate.effective_rate_pct.toFixed(2)}% effective rate (${county}, ZIP ${taxEstimate.zip ?? zip}).`
      );
    }
  }

  // Insurance / reserves use formula defaults (not Claude web search) to keep run cost low.
  noteParts.push(
    "Insurance and reserves use standard underwriting defaults — switch to Custom to override."
  );

  if (!usedWebSource && noteParts.length === 1) {
    noteParts.unshift(fallback.notes);
  }

  const result: OperatingEstimates = {
    property_tax_annual,
    insurance_annual: fallback.insurance_annual,
    hoa_monthly: fallback.hoa_monthly,
    maintenance_pct: fallback.maintenance_pct,
    vacancy_pct: fallback.vacancy_pct,
    management_pct: fallback.management_pct,
    notes: noteParts.join(" "),
    source: usedWebSource ? "web" : "fallback",
  };

  return NextResponse.json(result);
}
