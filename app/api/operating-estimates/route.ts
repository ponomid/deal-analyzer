import { NextResponse } from "next/server";
import { buildFallbackOperatingEstimates } from "@/lib/operating-defaults";
import { fetchPropertyTaxFromApiNinjas } from "@/lib/property-tax";
import type { OperatingEstimates, OperatingEstimatesRequest } from "@/lib/types";

export const runtime = "nodejs";

type WebOperatingPartial = {
  insurance_annual: number;
  hoa_monthly: number;
  maintenance_pct: number;
  vacancy_pct: number;
  management_pct: number;
  notes: string;
};

function parseWebOperatingPartial(payload: unknown): WebOperatingPartial | null {
  const data = payload as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const textBlocks = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text || "");
  const joined = textBlocks.join("\n");
  const start = joined.indexOf("{");
  const end = joined.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;

  try {
    const parsed = JSON.parse(joined.slice(start, end + 1)) as Partial<WebOperatingPartial>;
    if (!parsed.insurance_annual || parsed.insurance_annual <= 0) return null;
    return {
      insurance_annual: Number(parsed.insurance_annual),
      hoa_monthly: Number(parsed.hoa_monthly) || 0,
      maintenance_pct: Number(parsed.maintenance_pct) || 5,
      vacancy_pct: Number(parsed.vacancy_pct) || 5,
      management_pct: Number(parsed.management_pct) || 0,
      notes: parsed.notes || "Web-sourced insurance and reserve assumptions.",
    };
  } catch {
    return null;
  }
}

async function fetchWebOperatingEstimates(
  apiKey: string,
  address: string,
  zip: string | undefined,
  state: string | undefined,
  city: string | undefined
): Promise<WebOperatingPartial | null> {
  const location = [address, zip && `ZIP ${zip}`, city, state].filter(Boolean).join(", ");

  const prompt = `You are a rental property underwriting analyst. Search the web for current local data for a long-term rental at this property.

Property: ${location}

Instructions:
- Search for typical landlord / rental property insurance annual premiums in this ZIP or metro area.
- HOA: use $0 monthly unless you find evidence typical similar homes have HOA fees.
- Search for typical rental investor maintenance and vacancy reserve percentages used in this local rental market (as % of gross rent, not % of price).
- Property management: use 0% unless local norm for investors is clearly different.
- Do NOT estimate property tax — that is handled separately.

Respond with ONLY a raw JSON object and nothing else — no markdown, no commentary:
{"insurance_annual": <number>, "hoa_monthly": <number>, "maintenance_pct": <number>, "vacancy_pct": <number>, "management_pct": <number>, "notes": "<1-2 sentences citing what you found>"}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
      tools: [{ type: "web_search_20250305", name: "web_search" }],
    }),
  });

  if (!response.ok) return null;

  try {
    const data = await response.json();
    return parseWebOperatingPartial(data);
  } catch {
    return null;
  }
}

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

  let insurance_annual = fallback.insurance_annual;
  let hoa_monthly = fallback.hoa_monthly;
  let maintenance_pct = fallback.maintenance_pct;
  let vacancy_pct = fallback.vacancy_pct;
  let management_pct = fallback.management_pct;

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const web = await fetchWebOperatingEstimates(anthropicKey, address, zip, state, city);
    if (web) {
      insurance_annual = web.insurance_annual;
      hoa_monthly = web.hoa_monthly;
      maintenance_pct = web.maintenance_pct;
      vacancy_pct = web.vacancy_pct;
      management_pct = web.management_pct;
      noteParts.push(web.notes);
      usedWebSource = true;
    }
  }

  if (noteParts.length === 0) {
    noteParts.push(fallback.notes);
  }

  const result: OperatingEstimates = {
    property_tax_annual,
    insurance_annual,
    hoa_monthly,
    maintenance_pct,
    vacancy_pct,
    management_pct,
    notes: noteParts.join(" "),
    source: usedWebSource ? "web" : "fallback",
  };

  return NextResponse.json(result);
}
