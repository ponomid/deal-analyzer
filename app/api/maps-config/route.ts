import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Runtime map key for browser Static/Embed APIs (referrer-restricted keys). */
export async function GET() {
  const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY?.trim() || null;
  return NextResponse.json({ googleMapsKey });
}
