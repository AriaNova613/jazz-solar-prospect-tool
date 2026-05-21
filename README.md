# JAZZ Solar · Ontario Prospect Tool

Web-based map tool for finding Ontario land near transmission lines suitable for solar ground-mount projects. Hosted on Vercel, no API keys required.

## What it does

- **Map view** — Ontario 115/230/500 kV transmission lines (from OpenStreetMap), Crown land overlay (LIO CLUPA), and prospect pins color-coded by available MW
- **Circuit panel** — click any circuit in the sidebar to see available capacity (energy + capacity streams), land requirements, and rough interconnect cost context
- **Prospect panel** — click any prospect pin to see property details, copy ARN to clipboard, open GeoWarehouse in one click
- **Prospect pipeline** — `/prospects` table view with sort/filter, totals, and pipeline status tracking
- **"Find land" button** — with a circuit selected, opens the LIO Crown Land Atlas to screen nearby parcels

## What it cannot do

- **Find parcels automatically** — LIO parcel search within circuit buffer is scaffolded but not wired end-to-end (needs Supabase + PostGIS for spatial queries; see roadmap)
- **Show owner names** — parcel geometry + PIN/ARN is free from LIO; owner name requires GeoWarehouse/Teraview
- **Access Hydro One distribution data** — no public API; manually parse their PDF if needed
- **Cover zones outside Ottawa** — circuit data is Ottawa-zone only; add rows to `data/circuits.json` for other zones
- **Persist prospects across deploys** — prospects are in-memory server-side for MVP; add Vercel KV or Supabase for persistence

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
```

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Import the repo in Vercel — zero config required
3. Deploy

No environment variables needed for the MVP.

## Data sources (all free / open)

| Layer | Source | License |
|-------|--------|---------|
| Transmission lines | OpenStreetMap via Overpass API | ODbL |
| Crown land overlay | Ontario LIO CLUPA (WMS) | OGL-ON (free commercial) |
| Federal Crown land | LIO + NRCan | OGL-ON / OGL-CA |
| Parcel geometry + PIN/ARN | Ontario LIO / GeoHub | OGL-ON (geometry free; owner restricted) |
| Circuit capacity (Ottawa) | IESO LT2-c May 2025 + LT2-e Sept 2024 | Public |
| Basemap | OpenFreeMap (OSM vector tiles) | ODbL |

## Circuit data

Edit `data/circuits.json` to add circuits for other Ontario zones. Fields:

| Field | Description |
|-------|-------------|
| `energy_mw` | Max IBR MW from LT2-e energy stream (Sept 2024, concluded). 0 = AVOID. |
| `capacity_mw` | Max IBR MW from LT2-c capacity stream (May 2025). 0 = AVOID. |
| `status` | `good` / `limited` / `avoid` — controls color coding |

Bright-line defaults: 75 MW per 115 kV circuit, 250 MW per 230 kV circuit (Southern Ontario).

## Roadmap

- [ ] LIO parcel REST query within circuit buffer (requires Supabase + PostGIS)
- [ ] Vercel KV for persistent prospect storage
- [ ] All Ontario zones (Essa, East, West, Southwest, etc.)
- [ ] KMZ upload → nearest circuits analysis
- [ ] Interconnect cost estimator ($/MW by spur distance to tap + substation)
- [ ] OEB CCIM integration when public API is available
- [ ] Hydro One station capacity PDF parser for DX prospects
