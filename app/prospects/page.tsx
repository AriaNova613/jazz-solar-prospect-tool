'use client'

import { useState, useEffect } from 'react'
import { Prospect, getTierColor } from '@/lib/types'
import { Sun, ArrowLeft, ExternalLink, Copy } from 'lucide-react'
import Link from 'next/link'

const STATUS_ORDER: Prospect['status'][] = [
  'identified', 'researching', 'contacted', 'negotiating',
  'loi', 'option', 'diligence', 'permitting', 'killed',
]

const STATUS_LABELS: Record<string, string> = {
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

const STATUS_COLORS: Record<string, string> = {
  identified: 'bg-gray-100 text-gray-700',
  researching: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  negotiating: 'bg-orange-100 text-orange-700',
  loi: 'bg-purple-100 text-purple-700',
  option: 'bg-indigo-100 text-indigo-700',
  diligence: 'bg-cyan-100 text-cyan-700',
  permitting: 'bg-green-100 text-green-700',
  killed: 'bg-red-100 text-red-700',
}

const OWNER_TYPE_LABELS: Record<string, string> = {
  federal_crown: '🍁 Federal Crown',
  provincial_crown: '🏛️ Provincial Crown',
  private: '🏠 Private',
  municipal: '🏙️ Municipal',
  first_nation: '🪶 First Nation',
  unknown: '❓ Unknown',
}

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [sortBy, setSortBy] = useState<'mw' | 'acres' | 'status' | 'created'>('mw')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterOwner, setFilterOwner] = useState<string>('all')

  useEffect(() => {
    fetch('/api/prospects')
      .then(r => r.json())
      .then(setProspects)
  }, [])

  const filtered = prospects
    .filter(p => filterStatus === 'all' || p.status === filterStatus)
    .filter(p => filterOwner === 'all' || p.owner_type === filterOwner)
    .sort((a, b) => {
      if (sortBy === 'mw') return b.solar_mw_capped - a.solar_mw_capped
      if (sortBy === 'acres') return b.area_acres - a.area_acres
      if (sortBy === 'status') return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
      return b.created.localeCompare(a.created)
    })

  const totalMw = prospects.reduce((s, p) => s + p.solar_mw_capped, 0)
  const totalAcres = prospects.reduce((s, p) => s + p.area_acres, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Sun size={20} className="text-yellow-400" />
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
            <ArrowLeft size={14} /> Map View
          </Link>
          <span className="text-white font-bold">Prospect Pipeline</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-slate-400">
          <span>{prospects.length} sites · {totalAcres.toFixed(0)} ac · {totalMw} MW total</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2 text-sm">
            <label className="text-gray-600">Sort:</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="border border-gray-200 rounded px-2 py-1 text-sm bg-white">
              <option value="mw">MW (high → low)</option>
              <option value="acres">Acres</option>
              <option value="status">Pipeline stage</option>
              <option value="created">Date added</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <label className="text-gray-600">Status:</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="border border-gray-200 rounded px-2 py-1 text-sm bg-white">
              <option value="all">All</option>
              {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <label className="text-gray-600">Owner:</label>
            <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)}
              className="border border-gray-200 rounded px-2 py-1 text-sm bg-white">
              <option value="all">All types</option>
              {Object.entries(OWNER_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <span className="text-sm text-gray-400 ml-auto">{filtered.length} shown</span>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-4">🔍</div>
            <div className="font-medium">No prospects yet</div>
            <div className="text-sm mt-2">Go to map view, select a circuit, and save promising parcels as prospects.</div>
            <Link href="/" className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
              Open Map
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Property</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Acres</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Circuit</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Cap. MW</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Owner</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Contact</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const color = getTierColor(p.solar_mw_capped)
                  return (
                    <tr key={p.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{p.name}</div>
                        {p.notes && (
                          <div className="text-xs text-gray-400 mt-0.5 max-w-xs truncate" title={p.notes}>{p.notes}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                          {STATUS_LABELS[p.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{p.area_acres.toFixed(0)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">[{p.circuit_id}]</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold" style={{ color }}>{p.solar_mw_capped}</span>
                        <span className="text-xs text-gray-400"> / {p.solar_mw_potential}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs">{OWNER_TYPE_LABELS[p.owner_type]}</div>
                        {p.owner && <div className="text-xs text-gray-500 truncate max-w-[180px]" title={p.owner}>{p.owner}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-600">{p.contact_name || '—'}</div>
                        {p.contact_phone && <div className="text-xs text-gray-400">{p.contact_phone}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {p.arn && (
                            <button
                              onClick={() => navigator.clipboard.writeText(p.arn!)}
                              title="Copy ARN"
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <Copy size={12} className="text-gray-500" />
                            </button>
                          )}
                          <a href="https://www.geowarehouse.ca" target="_blank" rel="noopener noreferrer"
                            title="Open GeoWarehouse"
                            className="p-1 hover:bg-gray-200 rounded">
                            <ExternalLink size={12} className="text-gray-500" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                  <td className="px-4 py-3 text-gray-600">{filtered.length} properties</td>
                  <td />
                  <td className="px-4 py-3 text-right tabular-nums">{filtered.reduce((s, p) => s + p.area_acres, 0).toFixed(0)} ac</td>
                  <td />
                  <td className="px-4 py-3 text-right" style={{ color: getTierColor(50) }}>
                    {filtered.reduce((s, p) => s + p.solar_mw_capped, 0)} MW
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <strong>Data note:</strong> Capped MW = min(solar potential, circuit available MW). Owner names require GeoWarehouse lookup — copy the ARN using the icon, then paste into GeoWarehouse.
          Circuit data: IESO LT2-c May 2025 (Capacity_MW) and LT2-e Sept 2024 (Energy_MW).
        </div>
      </div>
    </div>
  )
}
