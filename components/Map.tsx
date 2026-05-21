'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import * as turf from '@turf/turf'
import { Circuit, Prospect, getTierColor, getMwLabel, getSolarPotential } from '@/lib/types'

interface MapProps {
  circuits: Circuit[]
  prospects: Prospect[]
  selectedCircuit: Circuit | null
  onCircuitSelect: (c: Circuit | null) => void
  onProspectSelect: (p: Prospect | null) => void
  showCrownLand: boolean
  showTransmissionLines: boolean
  showParcels: boolean
  minAcres: number
  bufferKm: number
}

// Overpass query for Ontario HV lines in a bounding box
function buildOverpassQuery(bounds: maplibregl.LngLatBounds): string {
  const s = bounds.getSouth().toFixed(4)
  const w = bounds.getWest().toFixed(4)
  const n = bounds.getNorth().toFixed(4)
  const e = bounds.getEast().toFixed(4)
  return `[out:json][timeout:60];(way["power"="line"]["voltage"~"^(115000|230000|500000)$"](${s},${w},${n},${e}););out geom;`
}

// Convert Overpass response to GeoJSON FeatureCollection
function overpassToGeoJSON(data: { elements: Array<{ type: string; geometry?: Array<{ lat: number; lon: number }>; tags?: Record<string, string> }> }): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []
  for (const el of data.elements) {
    if (el.type === 'way' && el.geometry && el.geometry.length >= 2) {
      const coords = el.geometry.map((pt) => [pt.lon, pt.lat])
      const voltage = parseInt(el.tags?.voltage || '0')
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords },
        properties: {
          voltage_kv: voltage / 1000,
          name: el.tags?.name || '',
          operator: el.tags?.operator || '',
        },
      })
    }
  }
  return { type: 'FeatureCollection', features }
}

// Color by voltage
function voltageColor(kv: number): string {
  if (kv >= 500) return '#7c3aed'  // purple — 500 kV
  if (kv >= 230) return '#2563eb'  // blue — 230 kV
  if (kv >= 115) return '#0891b2'  // teal — 115 kV
  return '#6b7280'
}

export default function Map({
  circuits,
  prospects,
  selectedCircuit,
  onCircuitSelect,
  onProspectSelect,
  showCrownLand,
  showTransmissionLines,
  showParcels,
  minAcres,
  bufferKm,
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [loadingLines, setLoadingLines] = useState(false)
  const markersRef = useRef<maplibregl.Marker[]>([])

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      // Free basemap from OpenFreeMap — no API key required
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [-76.5, 45.4], // Ottawa area default
      zoom: 8,
    })

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.current.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right')

    map.current.on('load', () => {
      const m = map.current!

      // ── Crown Land WMS overlay (LIO CLUPA) ───────────────────────────────
      m.addSource('crown-wms', {
        type: 'raster',
        tiles: [
          'https://ws.lioservices.lrc.gov.on.ca/arcgis1071a/services/LIO_OPEN_DATA/LIO_Open02/MapServer/WMSServer?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=0&STYLES=&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=true',
        ],
        tileSize: 256,
        attribution: '© Queen\'s Printer for Ontario, Land Information Ontario',
      })
      m.addLayer({
        id: 'crown-land',
        type: 'raster',
        source: 'crown-wms',
        paint: { 'raster-opacity': 0.35 },
        layout: { visibility: showCrownLand ? 'visible' : 'none' },
      })

      // ── Transmission lines (OSM) ─────────────────────────────────────────
      m.addSource('tx-lines', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      m.addLayer({
        id: 'tx-lines-500',
        type: 'line',
        source: 'tx-lines',
        filter: ['>=', ['get', 'voltage_kv'], 499],
        paint: { 'line-color': '#7c3aed', 'line-width': 3, 'line-opacity': 0.85 },
        layout: { visibility: showTransmissionLines ? 'visible' : 'none' },
      })
      m.addLayer({
        id: 'tx-lines-230',
        type: 'line',
        source: 'tx-lines',
        filter: ['all', ['>=', ['get', 'voltage_kv'], 229], ['<', ['get', 'voltage_kv'], 499]],
        paint: { 'line-color': '#2563eb', 'line-width': 2.5, 'line-opacity': 0.9 },
        layout: { visibility: showTransmissionLines ? 'visible' : 'none' },
      })
      m.addLayer({
        id: 'tx-lines-115',
        type: 'line',
        source: 'tx-lines',
        filter: ['all', ['>=', ['get', 'voltage_kv'], 100], ['<', ['get', 'voltage_kv'], 229]],
        paint: { 'line-color': '#0891b2', 'line-width': 2, 'line-opacity': 0.85 },
        layout: { visibility: showTransmissionLines ? 'visible' : 'none' },
      })

      // Popup on line click
      ;['tx-lines-500', 'tx-lines-230', 'tx-lines-115'].forEach((layerId) => {
        m.on('click', layerId, (e) => {
          if (!e.features?.[0]) return
          const props = e.features[0].properties as { voltage_kv: number; name: string; operator: string }
          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
              <div class="p-2 text-sm">
                <div class="font-bold">${props.voltage_kv} kV Line</div>
                ${props.name ? `<div>${props.name}</div>` : ''}
                ${props.operator ? `<div class="text-gray-500">${props.operator}</div>` : ''}
                <div class="text-xs text-gray-400 mt-1">Source: OpenStreetMap</div>
              </div>
            `)
            .addTo(m)
        })
        m.on('mouseenter', layerId, () => { m.getCanvas().style.cursor = 'pointer' })
        m.on('mouseleave', layerId, () => { m.getCanvas().style.cursor = '' })
      })

      // ── Buffer visualization source ──────────────────────────────────────
      m.addSource('circuit-buffer', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      m.addLayer({
        id: 'circuit-buffer-fill',
        type: 'fill',
        source: 'circuit-buffer',
        paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.08 },
      })
      m.addLayer({
        id: 'circuit-buffer-line',
        type: 'line',
        source: 'circuit-buffer',
        paint: { 'line-color': '#2563eb', 'line-width': 1, 'line-dasharray': [4, 2] },
      })

      setMapReady(true)
    })

    // Load transmission lines when map moves significantly
    map.current.on('moveend', () => {
      if (map.current!.getZoom() >= 7) {
        loadTransmissionLines()
      }
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load OSM transmission lines via our proxy
  const loadTransmissionLines = useCallback(async () => {
    if (!map.current || loadingLines) return
    const bounds = map.current.getBounds()
    const query = buildOverpassQuery(bounds)
    setLoadingLines(true)
    try {
      const res = await fetch('/api/overpass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      if (res.ok) {
        const data = await res.json()
        const geojson = overpassToGeoJSON(data)
        ;(map.current!.getSource('tx-lines') as maplibregl.GeoJSONSource)?.setData(geojson)
      }
    } finally {
      setLoadingLines(false)
    }
  }, [loadingLines])

  // Initial line load when map is ready
  useEffect(() => {
    if (mapReady) loadTransmissionLines()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady])

  // Toggle Crown land layer
  useEffect(() => {
    if (!mapReady || !map.current) return
    map.current.setLayoutProperty('crown-land', 'visibility', showCrownLand ? 'visible' : 'none')
  }, [showCrownLand, mapReady])

  // Toggle transmission line layers
  useEffect(() => {
    if (!mapReady || !map.current) return
    const vis = showTransmissionLines ? 'visible' : 'none'
    ;['tx-lines-500', 'tx-lines-230', 'tx-lines-115'].forEach(id =>
      map.current!.setLayoutProperty(id, 'visibility', vis)
    )
  }, [showTransmissionLines, mapReady])

  // Render prospect markers
  useEffect(() => {
    if (!mapReady || !map.current) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    for (const p of prospects) {
      if (!p.lat || !p.lng) continue
      const bestMw = p.solar_mw_capped
      const color = getTierColor(bestMw)

      const el = document.createElement('div')
      el.className = 'prospect-marker'
      el.style.cssText = `
        width:32px;height:32px;border-radius:50%;background:${color};
        border:3px solid white;cursor:pointer;display:flex;align-items:center;
        justify-content:center;font-size:10px;font-weight:700;color:white;
        box-shadow:0 2px 6px rgba(0,0,0,0.3);
      `
      el.textContent = bestMw >= 1 ? `${bestMw}` : '!'

      const popup = new maplibregl.Popup({ offset: 20 }).setHTML(`
        <div style="min-width:200px;padding:8px;font-family:sans-serif">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px">${p.name}</div>
          <div style="font-size:12px;color:#555">${p.area_acres.toFixed(1)} ac · ${p.solar_mw_potential} MW potential</div>
          <div style="font-size:12px;margin-top:4px">Circuit: <b>[${p.circuit_id}]</b> · Cap: <b>${p.solar_mw_capped} MW</b></div>
          <div style="font-size:11px;color:#888;margin-top:2px">${p.owner_type.replace('_', ' ')}</div>
          <div style="margin-top:6px;padding:3px 6px;background:${color};color:white;border-radius:4px;font-size:11px;display:inline-block">${p.status}</div>
        </div>
      `)

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([p.lng, p.lat])
        .setPopup(popup)
        .addTo(map.current!)

      el.addEventListener('click', () => onProspectSelect(p))
      markersRef.current.push(marker)
    }
  }, [prospects, mapReady, onProspectSelect])

  // Draw buffer when a circuit is selected (if we have a clicked point)
  // This is a simplified version — in practice the buffer would be around the circuit polyline
  useEffect(() => {
    if (!mapReady || !map.current) return
    const src = map.current.getSource('circuit-buffer') as maplibregl.GeoJSONSource
    if (!src) return
    if (!selectedCircuit) {
      src.setData({ type: 'FeatureCollection', features: [] })
    }
  }, [selectedCircuit, mapReady])

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      {loadingLines && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full shadow text-xs text-gray-600 flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading transmission lines…
        </div>
      )}
      {/* Voltage legend */}
      <div className="absolute bottom-10 left-4 bg-white rounded-lg shadow-md p-3 text-xs space-y-1.5">
        <div className="font-semibold text-gray-700 mb-1">Transmission Lines</div>
        {[
          { color: '#7c3aed', label: '500 kV' },
          { color: '#2563eb', label: '230 kV' },
          { color: '#0891b2', label: '115 kV' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-6 h-0.5 rounded" style={{ backgroundColor: color, height: 3 }} />
            <span className="text-gray-600">{label}</span>
          </div>
        ))}
        <div className="font-semibold text-gray-700 mt-2 mb-1">Circuit Capacity</div>
        {[
          { color: '#16a34a', label: '≥200 MW' },
          { color: '#65a30d', label: '100–199 MW' },
          { color: '#ca8a04', label: '50–99 MW' },
          { color: '#ea580c', label: '10–49 MW' },
          { color: '#dc2626', label: '1–9 MW' },
          { color: '#6b7280', label: 'Avoid' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: color }} />
            <span className="text-gray-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
