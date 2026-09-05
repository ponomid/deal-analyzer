import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Safe status for required server secrets (does not expose values).
 * Open: https://your-app.vercel.app/api/env-status
 */
export async function GET() {
  return NextResponse.json({
    envPresent: {
      ANTHROPIC_API_KEY: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
      API_NINJAS_API_KEY: Boolean(process.env.API_NINJAS_API_KEY?.trim()),
      GOOGLE_MAPS_API_KEY: Boolean(process.env.GOOGLE_MAPS_API_KEY?.trim()),
    },
  });
}
