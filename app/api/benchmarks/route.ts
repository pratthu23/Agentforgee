import { NextResponse } from 'next/server'
import { benchmarkSuites } from '@/lib/benchmarks'

export async function GET() {
  return NextResponse.json({ suites: benchmarkSuites })
}
