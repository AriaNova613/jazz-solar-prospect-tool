'use client'

import { Circuit, getTierColor, getMwLabel } from '@/lib/types'

interface FilterRailProps {
  circuits: Circuit[]
  selectedCircuit: Circuit | null
  onCircuitSelect: (c: Circuit | null) => void
  showCrownLand: boolean
  showTransmissionLines: boolean
  showParcels: boolean
  minAcres: number
  bufferKm: number
  onToggleCrown: (v: boolean) => void
  onToggleLines: (v: boolean) => void
  onToggleParcels: (v: boolean) => void
  onMinAcresChange: (v: number) => void
  onBufferKmChange: (v: number) => void
  onFindParcels: () => void
}

const statusGroups = [
  { label: 'Good (no restrictions)', key: 'good' },
  { label: 'Limited (circuit congestion)', key: 'limited' },
  { label: 'Avoid', key: 'avoid' },
]

export default function FilterRail({
  circuits, selectedCircuit, onCircuitSelect,
  showCrownLand, showTransmissionLines, showParcels,
  minAcres, bufferKm,
  onToggleCrown, onToggleLines, onToggleParcels,
  onMinAcresChange, onBufferKmChange, onFindParcels,
}: FilterRailProps) {
  return (
    <aside className="w-72 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
      {/* Layers */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Layers</h3>
        <label className="flex items-center gap-2 mb-2 cursor-pointer">
          <input type="checkbox" checked={showTransmissionLines} onChange={e => onToggleLines(e.target.checked)} className="accent-blue-600" />
          <span className="text-sm">Transmission Lines (OSM)</span>
        </label>
        <label className="flex items-center gap-2 mb-2 cursor-pointer">
          <input type="checkbox" checked={showCrownLand} onChange={e => onToggleCrown(e.target.checked)} className="accent-green-600" />
          <span className="text-sm">Crown Land (LIO)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showParcels} onChange={e => onToggleParcels(e.target.checked)} className="accent-orange-600" />
          <span className="text-sm">Parcel fabric (LIO)</span>
        </label>
      </div>

      {/* Parcel search filters */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Find Land Near Circuit</h3>

        <label className="block text-xs text-gray-600 mb-1">Minimum size (acres): <span className="font-semibold text-gray-800">{minAcres}</span></label>
        <input type="range" min={50} max={2000} step={50} value={minAcres}
          onChange={e => onMinAcresChange(Number(e.target.value))}
          className="w-full accent-blue-600 mb-3" />

        <label className="block text-xs text-gray-600 mb-1">Buffer from line (km): <span className="font-semibold text-gray-800">{bufferKm}</span></label>
        <input type="range" min={1} max={20} step={1} value={bufferKm}
          onChange={e => onBufferKmChange(Number(e.target.value))}
          className="w-full accent-blue-600 mb-3" />

        <button
          onClick={onFindParcels}
          disabled={!selectedCircuit}
          className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {selectedCircuit ? `Find land near [${selectedCircuit.id}]` : 'Select a circuit first'}
        </button>
        <p className="text-xs text-gray-400 mt-2">Select a circuit from the list below, then click to find Crown land and large parcels within the buffer.</p>
      </div>

      {/* Circuit list */}
      <div className="p-4 flex-1">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Ottawa Zone Circuits</h3>
        {statusGroups.map(group => {
          const grouped = circuits.filter(c => c.status === group.key)
          if (!grouped.length) return null
          return (
            <div key={group.key} className="mb-4">
              <div className="text-xs text-gray-400 mb-1">{group.label}</div>
              {grouped.map(c => {
                const bestMw = Math.max(c.energy_mw, c.capacity_mw)
                const color = getTierColor(bestMw)
                const isSelected = selectedCircuit?.id === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => onCircuitSelect(isSelected ? null : c)}
                    className={`w-full text-left px-3 py-2 rounded-lg mb-1 flex items-center gap-2 transition-colors text-sm ${
                      isSelected ? 'bg-blue-50 border border-blue-300' : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="font-mono font-medium">[{c.id}]</span>
                    <span className="text-gray-500 text-xs ml-auto">{c.voltage_kv} kV · {getMwLabel(c)}</span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
