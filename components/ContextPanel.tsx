'use client'

import { Circuit, Prospect, getTierColor, getMwLabel, getSolarPotential, CAPACITY_TIERS } from '@/lib/types'
import { X, ExternalLink, Copy, MapPin, Zap, TrendingUp } from 'lucide-react'

interface ContextPanelProps {
  selectedCircuit: Circuit | null
  selectedProspect: Prospect | null
  onClose: () => void
  onSaveProspect: (p: Partial<Prospect>) => void
}

function CopyBtn({ text, label }: { text: string; label: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text)}
      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs transition-colors"
      title={`Copy ${label}`}
    >
      <Copy size={10} /> {label}
    </button>
  )
}

function MwBar({ mw, max = 250 }: { mw: number; max?: number }) {
  const pct = Math.min(100, (mw / max) * 100)
  const color = getTierColor(mw)
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

export default function ContextPanel({ selectedCircuit, selectedProspect, onClose, onSaveProspect }: ContextPanelProps) {
  if (!selectedCircuit && !selectedProspect) {
    return (
      <aside className="w-80 bg-white border-l border-gray-200 flex flex-col items-center justify-center p-8 text-center">
        <div className="text-4xl mb-4">🗺️</div>
        <h3 className="font-semibold text-gray-700 mb-2">Select a circuit or prospect</h3>
        <p className="text-sm text-gray-400">Click a circuit in the list or a prospect pin on the map to see details here.</p>
        <div className="mt-8 text-left w-full">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick tips</div>
          <ul className="text-xs text-gray-500 space-y-2">
            <li>• Select a circuit → adjust buffer → <b>Find land</b> to locate Crown/private parcels nearby</li>
            <li>• Blue lines = 230 kV · Teal = 115 kV · Purple = 500 kV</li>
            <li>• Green shading = provincial Crown land</li>
            <li>• Numbered pins = prospect sites (number = capped MW)</li>
          </ul>
        </div>
      </aside>
    )
  }

  // ── Prospect panel ────────────────────────────────────────────────────────
  if (selectedProspect) {
    const p = selectedProspect
    const color = getTierColor(p.solar_mw_capped)
    const ownerTypeLabel: Record<string, string> = {
      federal_crown: 'Federal Crown',
      provincial_crown: 'Provincial Crown',
      private: 'Private',
      municipal: 'Municipal',
      first_nation: 'First Nation',
      unknown: 'Unknown',
    }
    const statusLabel: Record<string, string> = {
      identified: 'Identified',
      researching: 'Researching',
      contacted: 'Contacted',
      negotiating: 'Negotiating',
      loi: 'LOI',
      option: 'Option',
      diligence: 'Diligence',
      permitting: 'Permitting',
      killed: 'Killed',
    }

    return (
      <aside className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-y-auto">
        <div className="flex items-start justify-between p-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">{p.name}</h2>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: color }}>
              {statusLabel[p.status] || p.status}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={16} /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Area</div>
              <div className="font-bold text-lg">{p.area_acres.toFixed(0)} ac</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Solar potential</div>
              <div className="font-bold text-lg" style={{ color }}>{p.solar_mw_capped} MW</div>
              <div className="text-xs text-gray-400">of {p.solar_mw_potential} MW gross</div>
            </div>
          </div>

          {/* Circuit */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Circuit</div>
            <div className="font-mono text-sm font-medium">[{p.circuit_id}]</div>
          </div>

          {/* Owner */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Owner</div>
            <div className="text-sm">{p.owner || ownerTypeLabel[p.owner_type]}</div>
            <div className="text-xs text-gray-400">{ownerTypeLabel[p.owner_type]}</div>
          </div>

          {/* IDs with copy buttons */}
          {(p.pin || p.arn) && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Land Registry</div>
              <div className="flex flex-wrap gap-2">
                {p.pin && <CopyBtn text={p.pin} label={`PIN: ${p.pin}`} />}
                {p.arn && <CopyBtn text={p.arn} label={`ARN: ${p.arn}`} />}
              </div>
              <a
                href="https://www.geowarehouse.ca"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline"
              >
                <ExternalLink size={10} /> Open GeoWarehouse
              </a>
            </div>
          )}

          {/* Contact */}
          {p.contact_name && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Contact</div>
              <div className="text-sm">{p.contact_name}</div>
              {p.contact_phone && <div className="text-xs text-gray-500">{p.contact_phone}</div>}
              {p.contact_email && <div className="text-xs text-gray-500">{p.contact_email}</div>}
            </div>
          )}

          {/* Notes */}
          {p.notes && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</div>
              <div className="text-xs text-gray-600 bg-amber-50 rounded p-2">{p.notes}</div>
            </div>
          )}

          {/* Crown land action links */}
          {p.owner_type === 'federal_crown' && (
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-xs font-semibold text-blue-800 mb-2">Federal Crown — Next steps</div>
              <a href="https://www.clss.nrcan-rncan.gc.ca" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-700 hover:underline mb-1">
                <ExternalLink size={10} /> Canada Lands Survey System
              </a>
              <a href="https://www.canada.ca/en/public-services-procurement/services/real-property/realty-asset-management/leasing-federal-property.html"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-700 hover:underline">
                <ExternalLink size={10} /> Federal Property Leasing (PSPC)
              </a>
            </div>
          )}
          {p.owner_type === 'provincial_crown' && (
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-xs font-semibold text-green-800 mb-2">Provincial Crown — Next steps</div>
              <a href="https://www.ontario.ca/page/crown-land-use-policy-atlas"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-green-700 hover:underline">
                <ExternalLink size={10} /> MNRF Crown Land Use Policy Atlas
              </a>
            </div>
          )}
        </div>
      </aside>
    )
  }

  // ── Circuit panel ─────────────────────────────────────────────────────────
  const c = selectedCircuit!
  const bestMw = Math.max(c.energy_mw, c.capacity_mw)
  const color = getTierColor(bestMw)
  const tier = CAPACITY_TIERS.find(t => bestMw >= t.min) || CAPACITY_TIERS[CAPACITY_TIERS.length - 1]

  // Interconnect cost estimate (rough heuristic)
  const estLandNeeded = Math.round(bestMw * 5)
  const estimateDollarPerMw = bestMw > 0 ? `$${(1_000_000).toLocaleString()}–$${(3_000_000).toLocaleString()} / km of spur line` : 'N/A'

  return (
    <aside className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-y-auto">
      <div className="flex items-start justify-between p-4 border-b border-gray-100">
        <div>
          <h2 className="font-bold text-gray-900 font-mono text-lg">[{c.id}]</h2>
          <span className="text-sm text-gray-500">{c.voltage_kv} kV · {c.zone} zone</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={16} /></button>
      </div>

      <div className="p-4 space-y-5">
        {/* Capacity meters */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Available Capacity (IBR / Solar)</div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">Energy stream (LT2-e)</span>
                <span className="font-bold" style={{ color: getTierColor(c.energy_mw) }}>
                  {c.energy_mw === 0 ? 'AVOID' : `${c.energy_mw} MW`}
                </span>
              </div>
              <MwBar mw={c.energy_mw} />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">Capacity stream (LT2-c)</span>
                <span className="font-bold" style={{ color: getTierColor(c.capacity_mw) }}>
                  {c.capacity_mw === 0 ? 'AVOID' : `${c.capacity_mw} MW`}
                </span>
              </div>
              <MwBar mw={c.capacity_mw} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-sm font-semibold" style={{ color }}>{tier.label}</span>
          </div>
        </div>

        {/* Land requirements */}
        {bestMw > 0 && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-xs font-semibold text-gray-600 mb-2">
              <MapPin size={12} /> Land Requirements
            </div>
            <div className="text-sm">~<b>{estLandNeeded.toLocaleString()} acres</b> needed for full {bestMw} MW</div>
            <div className="text-xs text-gray-500 mt-1">Based on 5 ac/MW rule of thumb</div>
          </div>
        )}

        {/* Interconnect cost estimator */}
        {bestMw > 0 && (
          <div className="bg-amber-50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-xs font-semibold text-amber-800 mb-2">
              <TrendingUp size={12} /> Interconnect Cost (rough)
            </div>
            <div className="text-xs text-amber-700 space-y-1">
              <div>Spur line: {estimateDollarPerMw}</div>
              <div>Closer to the circuit = lower spur cost</div>
              <div className="text-amber-600 mt-2">💡 Sort prospects by $/MW to find the best deal</div>
            </div>
          </div>
        )}

        {/* Substation */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Area / Substation</div>
          <div className="text-sm">{c.substation}</div>
        </div>

        {/* Notes */}
        {c.notes && (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">IESO Guidance Notes</div>
            <div className="text-xs text-gray-600 bg-amber-50 rounded p-2">{c.notes}</div>
          </div>
        )}

        {/* Data sources */}
        <div className="text-xs text-gray-400 pt-2 border-t border-gray-100 space-y-1">
          <div className="font-medium text-gray-500">Sources</div>
          <div>Energy MW: IESO LT2-e Issue 2.0, Sept 2024</div>
          <div>Capacity MW: IESO LT2-c May 15 2025</div>
        </div>
      </div>
    </aside>
  )
}
