import { NextResponse } from "next/server";
import { isMultiUnitProperty, propertyTypeLabel } from "@/lib/property-type";
import type { AnalyzeRequest, PropertyType, RentEstimate, UnitInfo } from "@/lib/types";

export const runtime = "nodejs";

function overrideEstimate(override: number): RentEstimate {
  return {
    estimated_rent: override,
    rent_low: override,
    rent_high: override,
    comps: [],
    notes: "Using your manual rent override — no live comp search was run.",
  };
}

function parseRentEstimate(payload: unknown, propertyType: PropertyType): RentEstimate {
  const data = payload as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const textBlocks = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text || "");
  const joined = textBlocks.join("\n");
  const start = joined.indexOf("{");
  const end = joined.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Could not parse rent estimate from response");
  }
  const jsonStr = joined.slice(start, end + 1);
  try {
    const parsed = JSON.parse(jsonStr) as RentEstimate;
    return {
      ...parsed,
      property_type: propertyType,
      comps: parsed.comps || [],
      units: isMultiUnitProperty(propertyType) ? parsed.units || [] : undefined,
    };
  } catch {
    throw new Error("Rent estimate response was not valid JSON");
  }
}

function formatUnitLine(unit: UnitInfo, index: number): string {
  const label = unit.label || `Unit ${index + 1}`;
  return `${label}: ${unit.beds ?? "?"} bed / ${unit.baths ?? "?"} bath, ${unit.sqft ?? "?"} sqft`;
}

function buildSingleFamilyPrompt(
  address: string,
  beds: number | null | undefined,
  baths: number | null | undefined,
  sqft: number | null | undefined
): string {
  return `You are a rental market analyst. Search the web for current long-term rental listings comparable to the property below, then estimate fair market monthly rent.

Property type: Single-family house
Address: ${address}
Layout: ${beds || "?"} bed / ${baths || "?"} bath, ${sqft || "?"} sqft (approx).

Instructions:
- Search for at least 3 comparable active or recent long-term rental listings within a reasonable distance of this address, matching bed/bath count and similar size where possible.
- Use at most 2 web searches total. Prefer one focused search for rentals near this address.
- Base your estimate on real data found via search, not assumptions.
- After searching, respond with ONLY a raw JSON object and nothing else - no markdown fences, no commentary, no citation formatting. Match exactly this shape:
{"estimated_rent": <number>, "rent_low": <number>, "rent_high": <number>, "comps": [{"address": "<string>", "rent": <number>, "beds": <number>, "baths": <number>, "sqft": <number>, "source": "<string like Zillow, Apartments.com, Rent.com, Craigslist>"}], "notes": "<1-2 sentence explanation of your estimate>"}
- If beds/baths/sqft were not provided, estimate reasonably for the area and mention this in notes.
- Do not wrap the JSON in backticks or add any text before or after it.`;
}

function buildMultiUnitPrompt(address: string, units: UnitInfo[], propertyType: PropertyType): string {
  const unitLines = units.map((unit, i) => formatUnitLine(unit, i)).join("\n");
  const typeLabel = propertyTypeLabel(propertyType);

  return `You are a rental market analyst. Search the web for current long-term rental listings comparable to each unit in this ${typeLabel.toLowerCase()} property, then estimate fair market monthly rent per unit and the total building rent.

Property type: ${typeLabel}
Address: ${address}
Units:
${unitLines}

Instructions:
- For each unit, search for comparable active or recent long-term rental listings nearby that match that unit's bed/bath and size.
- Estimate monthly rent for each unit separately, then set estimated_rent to the sum of all unit rents.
- Include at least 3 comps total across units (can be mixed unit types).
- Base estimates on real data found via search, not assumptions.
- After searching, respond with ONLY a raw JSON object and nothing else - no markdown fences, no commentary, no citation formatting. Match exactly this shape:
{"estimated_rent": <total monthly rent for all units>, "rent_low": <number>, "rent_high": <number>, "units": [{"label": "<unit label>", "estimated_rent": <number>, "rent_low": <number>, "rent_high": <number>}], "comps": [{"address": "<string>", "rent": <number>, "beds": <number>, "baths": <number>, "sqft": <number>, "source": "<string>"}], "notes": "<1-2 sentence explanation>"}
- estimated_rent must equal the sum of per-unit estimated_rent values.
- Do not wrap the JSON in backticks or add any text before or after it.`;
}

function normalizePropertyType(value: unknown): PropertyType {
  if (
    value === "single_family" ||
    value === "duplex" ||
    value === "triplex" ||
    value === "multifamily"
  ) {
    return value;
  }
  return "single_family";
}

export async function POST(request: Request) {
  let body: AnalyzeRequest;
  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const override = Number(body.override) || 0;
  if (override > 0) {
    return NextResponse.json(overrideEstimate(override));
  }

  const address = (body.address || "").trim();
  if (!address) {
    return NextResponse.json(
      { error: "Enter a property address (or a manual rent override) before running the analysis." },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing ANTHROPIC_API_KEY" },
      { status: 500 }
    );
  }

  const propertyType = normalizePropertyType(body.propertyType);

  let prompt: string;
  if (isMultiUnitProperty(propertyType)) {
    const units = (body.units || []).filter(
      (u) => u.label || u.beds != null || u.baths != null || u.sqft != null
    );
    if (units.length === 0) {
      return NextResponse.json(
        {
          error: `Add unit details (beds, baths, or sqft) for ${propertyTypeLabel(propertyType).toLowerCase()} analysis.`,
        },
        { status: 400 }
      );
    }
    prompt = buildMultiUnitPrompt(address, units, propertyType);
  } else {
    prompt = buildSingleFamilyPrompt(address, body.beds, body.baths, body.sqft);
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
      // Cap searches — each is ~$0.01 plus large token costs for result pages
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }],
    }),
  });

  if (!response.ok) {
    let detail = `Search request failed (${response.status})`;
    try {
      const errBody = (await response.json()) as {
        error?: { message?: string };
      };
      if (errBody.error?.message) detail = errBody.error.message;
    } catch {
      // keep generic message if response isn't JSON
    }
    return NextResponse.json({ error: detail }, { status: 502 });
  }

  try {
    const data = await response.json();
    const parsed = parseRentEstimate(data, propertyType);
    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not parse rent estimate";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
