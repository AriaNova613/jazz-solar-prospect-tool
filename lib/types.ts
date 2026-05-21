export type CircuitStatus = 'good' | 'limited' | 'avoid'

export interface Circuit {
  id: string
  voltage_kv: number
  zone: string
  energy_mw: number
  capacity_mw: number
  status: CircuitStatus
  substation: string
  notes: string
  lat?: number
  lng?: number
  geojson?: GeoJSON.Feature | null
}

export type OwnerType = 'provincial_crown' | 'federal_crown' | 'private' | 'municipal' | 'first_nation' | 'unknown'

export type ProspectStatus =
  | 'identified'
  | 'researching'
  | 'contacted'
  | 'negotiating'
  | 'loi'
  | 'option'
  | 'diligence'
  | 'permitting'
  | 'killed'

export interface Prospect {
  id: string
  name: string
  pin?: string
  arn?: string
  owner?: string
  owner_type: OwnerType
  area_acres: number
  circuit_id?: string
  lat?: number
  lng?: number
  solar_mw_potential: number
  solar_mw_capped: number
  status: ProspectStatus
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  notes?: string
  created: string
  updated?: string
}

export interface LIOParcel {
  pin: string
  arn: string
  geometry: GeoJSON.Geometry
  area_m2?: number
}

export type MapMode = 'browse' | 'find-parcels' | 'upload'

export const CAPACITY_TIERS = [
  { min: 200, label: '200+ MW',  color: '#16a34a', textColor: '#fff' },
  { min: 100, label: '100–199 MW', color: '#65a30d', textColor: '#fff' },
  { min: 50,  label: '50–99 MW',  color: '#ca8a04', textColor: '#fff' },
  { min: 10,  label: '10–49 MW',  color: '#ea580c', textColor: '#fff' },
  { min: 1,   label: '1–9 MW',   color: '#dc2626', textColor: '#fff' },
  { min: 0,   label: 'Avoid',    color: '#6b7280', textColor: '#fff' },
]

export function getTierColor(mw: number): string {
  for (const tier of CAPACITY_TIERS) {
    if (mw >= tier.min) return tier.color
  }
  return '#6b7280'
}

export function getMwLabel(circuit: Circuit): string {
  const best = Math.max(circuit.energy_mw, circuit.capacity_mw)
  if (best === 0) return 'Avoid'
  return `${best} MW`
}

export function getSolarPotential(acres: number): number {
  return Math.round(acres / 5)
}
