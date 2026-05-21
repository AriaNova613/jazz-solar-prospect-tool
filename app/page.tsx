'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import FilterRail from '@/components/FilterRail'
import ContextPanel from '@/components/ContextPanel'
import { Circuit, Prospect } from '@/lib/types'
import circuitsData from '@/data/circuits.json'
import { Sun, List } from 'lucide-react'
import Link from 'next/link'

// MapLibre must be loaded client-side only (no SSR)
const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <div className="text-sm text-gray-500">Loading map…</div>
      </div>
    </div>
  ),
})

export default function HomePage() {
  const circuits: Circuit[] = circuitsData.circuits as Circuit[]
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [selectedCircuit, setSelectedCircuit] = useState<Circuit | null>(null)
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)
  const [showCrownLand, setShowCrownLand] = useState(true)
  const [showTransmissionLines, setShowTransmissionLines] = useState(true)
  const [showParcels, setShowParcels] = useState(false)
  const [minAcres, setMinAcres] = useState(200)
  const [bufferKm, setBufferKm] = useState(5)

  useEffect(() => {
    fetch('/api/prospects')
      .then(r => r.json())
      .then(setProspects)
      .catch(console.error)
  }, [])

  const handleClose = useCallback(() => {
    setSelectedCircuit(null)
    setSelectedProspect(null)
  }, [])

  const handleCircuitSelect = useCallback((c: Circuit | null) => {
    setSelectedCircuit(c)
    if (c) setSelectedProspect(null)
  }, [])

  const handleProspectSelect = useCallback((p: Prospect | null) => {
    setSelectedProspect(p)
    if (p) setSelectedCircuit(null)
  }, [])

  const handleSaveProspect = useCallback(async (data: Partial<Prospect>) => {
    const res = await fetch('/api/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json()
      setProspects(prev => [...prev.filter(p => p.id !== updated.id), updated])
    }
  }, [])

  const handleFindParcels = useCallback(() => {
    if (!selectedCircuit?.lat || !selectedCircuit?.lng) return
    // Compute bbox from circuit center + buffer radius, open LIO Crown Land Atlas at that extent
    const R = 111.32
    const latD = bufferKm / R
    const lngD = bufferKm / (R * Math.cos(selectedCircuit.lat * Math.PI / 180))
    const xmin = (selectedCircuit.lng - lngD).toFixed(4)
    const ymin = (selectedCircuit.lat - latD).toFixed(4)
    const xmax = (selectedCircuit.lng + lngD).toFixed(4)
    const ymax = (selectedCircuit.lat + latD).toFixed(4)
    window.open(
      `https://geohub.lio.gov.on.ca/maps/lio::crown-land-use-policy-atlas?extent=${xmin},${ymin},${xmax},${ymax}`,
      '_blank'
    )
  }, [selectedCircuit, bufferKm])

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Sun size={20} className="text-yellow-400" />
          <div>
            <span className="font-bold text-sm">JAZZ Solar</span>
            <span className="text-slate-400 text-sm"> · Ontario Prospect Tool</span>
          </div>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <span className="text-slate-400">
            {prospects.length} prospect{prospects.length !== 1 ? 's' : ''} · {circuits.filter(c => c.status === 'good').length} good circuits
          </span>
          <Link href="/prospects" className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
            <List size={14} /> Prospects
          </Link>
        </nav>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        <FilterRail
          circuits={circuits}
          selectedCircuit={selectedCircuit}
          onCircuitSelect={handleCircuitSelect}
          showCrownLand={showCrownLand}
          showTransmissionLines={showTransmissionLines}
          showParcels={showParcels}
          minAcres={minAcres}
          bufferKm={bufferKm}
          onToggleCrown={setShowCrownLand}
          onToggleLines={setShowTransmissionLines}
          onToggleParcels={setShowParcels}
          onMinAcresChange={setMinAcres}
          onBufferKmChange={setBufferKm}
          onFindParcels={handleFindParcels}
        />

        <main className="flex-1 relative overflow-hidden">
          <Map
            circuits={circuits}
            prospects={prospects}
            selectedCircuit={selectedCircuit}
            onCircuitSelect={handleCircuitSelect}
            onProspectSelect={handleProspectSelect}
            showCrownLand={showCrownLand}
            showTransmissionLines={showTransmissionLines}
            showParcels={showParcels}
            minAcres={minAcres}
            bufferKm={bufferKm}
          />
        </main>

        <ContextPanel
          selectedCircuit={selectedCircuit}
          selectedProspect={selectedProspect}
          onClose={handleClose}
          onSaveProspect={handleSaveProspect}
        />
      </div>
    </div>
  )
}
