import { NextRequest, NextResponse } from 'next/server'

// Proxy for Overpass API to avoid CORS issues
// Fetches Ontario HV transmission lines (115kV, 230kV, 500kV)

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()
    if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 })

    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      next: { revalidate: 3600 }, // cache 1 hour
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Overpass API error', status: res.status }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// Build Overpass QL query for HV lines in a bounding box
export function buildHvLineQuery(south: number, west: number, north: number, east: number): string {
  return `
[out:json][timeout:60];
(
  way["power"="line"]["voltage"~"^(115000|230000|500000)$"](${south},${west},${north},${east});
);
out geom;
`
}
