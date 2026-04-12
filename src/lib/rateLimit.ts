import fs from 'fs'
import path from 'path'
import os from 'os'

const LIMITS_FILE = process.env.RATE_LIMIT_FILE ?? path.join(os.tmpdir(), 'faucet-limits.json')
const COOLDOWN_MS = 24 * 60 * 60 * 1000 // 24 hours
const CLEANUP_AGE_MS = 48 * 60 * 60 * 1000 // purge entries older than 48h

type LimitsMap = Record<string, number>

function readLimits(): LimitsMap {
  try {
    if (fs.existsSync(LIMITS_FILE)) {
      const raw = fs.readFileSync(LIMITS_FILE, 'utf-8')
      return JSON.parse(raw) as LimitsMap
    }
  } catch {
    // file missing or corrupt — start fresh
  }
  return {}
}

function writeLimits(limits: LimitsMap): void {
  try {
    fs.writeFileSync(LIMITS_FILE, JSON.stringify(limits, null, 2), 'utf-8')
  } catch {
    // non-fatal — rate limit state lost on write failure
  }
}

export function checkRateLimit(ip: string): { allowed: boolean; cooldownSeconds: number } {
  const limits = readLimits()
  const now = Date.now()
  const lastRequest = limits[ip] ?? 0
  const elapsed = now - lastRequest

  if (elapsed < COOLDOWN_MS) {
    const remainingMs = COOLDOWN_MS - elapsed
    return { allowed: false, cooldownSeconds: Math.ceil(remainingMs / 1000) }
  }

  return { allowed: true, cooldownSeconds: 0 }
}

export function recordRequest(ip: string): void {
  const limits = readLimits()
  const now = Date.now()
  limits[ip] = now

  // Purge stale entries to keep the file small
  const cutoff = now - CLEANUP_AGE_MS
  for (const key of Object.keys(limits)) {
    if (limits[key] < cutoff) delete limits[key]
  }

  writeLimits(limits)
}
