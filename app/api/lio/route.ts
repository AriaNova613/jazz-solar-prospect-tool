import { NextRequest, NextResponse } from 'next/server'

// Proxy for Ontario LIO ArcGIS REST services
// Used for Crown land and parcel queries

const LIO_BASE = 'https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA'

// Layer IDs
export const LIO_LAYERS = {
  FEDERAL_CROWN: `${LIO_BASE}/LIO_Open06/MapServer/0`,
  CROWN_CLUPA_OVERLAY: `${LIO_BASE}/LIO_Open06/MapServer/4`,
  CROWN_CLUPA_PROVINCIAL: `${LIO_BASE}/LIO_Open06/MapServer/5`,
  UTILITY_LINE: `${LIO_BASE}/LIO_Open05/MapServer/11`,
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const layer = searchParams.get('layer') || 'CROWN_CLUPA_PROVINCIAL'
  const geometry = searchParams.get('geometry')
  const bufferKm = parseFloat(searchParams.get('buffer_km') || '5')
  const minAcres = parseFloat(searchParams.get('min_acres') || '100')

  const baseUrl = LIO_LAYERS[layer as keyof typeof LIO_LAYERS]
  if (!baseUrl) return NextResponse.json({ error: 'Unknown layer' }, { status: 400 })

  try {
    // Build ArcGIS REST query
    const params = new URLSearchParams({
      f: 'geojson',
      outFields: '*',
      returnGeometry: 'true',
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      ...(geometry ? { geometry, inSR: '4326', outSR: '4326' } : {}),
      resultRecordCount: '50',
    })

    const url = `${baseUrl}/query?${params}`
    const res = await fetch(url, { next: { revalidate: 300 } })

    if (!res.ok) {
      return NextResponse.json({ error: 'LIO query failed', status: res.status }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
