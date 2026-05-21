import { NextRequest, NextResponse } from 'next/server'
import { Prospect } from '@/lib/types'
import circuitsData from '@/data/circuits.json'

// In-memory store for MVP — replace with Vercel KV or Supabase for multi-user
// Data is seeded from circuits.json prospects array on first load
let prospects: Prospect[] = circuitsData.prospects as Prospect[]

export async function GET() {
  return NextResponse.json(prospects)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const prospect: Prospect = {
    ...body,
    id: body.id || `p${Date.now()}`,
    created: body.created || new Date().toISOString().split('T')[0],
    updated: new Date().toISOString().split('T')[0],
  }
  prospects = prospects.filter(p => p.id !== prospect.id)
  prospects.push(prospect)
  return NextResponse.json(prospect)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  prospects = prospects.filter(p => p.id !== id)
  return NextResponse.json({ ok: true })
}
