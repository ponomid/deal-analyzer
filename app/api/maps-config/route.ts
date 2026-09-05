import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Safe status for map configuration (does not expose secret values).
 * Open: https://your-app.vercel.app/api/maps-config
 */
export async function GET() {
  return NextResponse.json({
    configured: Boolean(
      process.env.GOOGLE_MAPS_API_KEY?.trim() ||
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
        process.env.GOOGLE_MAPS_KEY?.trim()
    ),
    envPresent: {
      GOOGLE_MAPS_API_KEY: Boolean(process.env.GOOGLE_MAPS_API_KEY?.trim()),
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()),
      GOOGLE_MAPS_KEY: Boolean(process.env.GOOGLE_MAPS_KEY?.trim()),
    },
  });
}
