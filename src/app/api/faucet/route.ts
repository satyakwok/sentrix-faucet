import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, recordRequest } from '@/lib/rateLimit'

const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/

function getClientIP(request: NextRequest): string {
  // Trust Nginx X-Real-IP / X-Forwarded-For in production
  const realIP = request.headers.get('x-real-ip')
  if (realIP) return realIP.trim()

  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()

  return '127.0.0.1'
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { address } = body as { address?: string }

    // Validate address format
    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing wallet address' },
        { status: 400 }
      )
    }

    if (!ADDRESS_REGEX.test(address)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address (must be 0x + 40 hex characters)' },
        { status: 400 }
      )
    }

    // Check rate limit by IP
    const ip = getClientIP(request)
    const { allowed, cooldownSeconds } = checkRateLimit(ip)

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit: 1 request per 24 hours per IP address',
          cooldown: cooldownSeconds,
        },
        { status: 429 }
      )
    }

    // Validate server-side env config
    const faucetPrivateKey = process.env.FAUCET_PRIVATE_KEY
    const faucetAddress = process.env.FAUCET_ADDRESS
    const rpcUrl = process.env.RPC_URL ?? 'http://103.175.219.233:8545/rpc'
    const amount = parseInt(process.env.FAUCET_AMOUNT ?? '10', 10)

    if (!faucetPrivateKey || faucetPrivateKey === 'FILL_IN_FROM_GENESIS_WALLETS') {
      console.error('[faucet] FAUCET_PRIVATE_KEY not configured')
      return NextResponse.json(
        { success: false, error: 'Faucet not configured — contact admin' },
        { status: 503 }
      )
    }

    // Send SRX via Sentrix JSON-RPC
    // Method: sentrix_sendTransaction
    // Params: from, to, amount (in SRX), private_key (server-side only — never exposed to client)
    let rpcRes: Response
    try {
      rpcRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'sentrix_sendTransaction',
          params: [
            {
              from: faucetAddress,
              to: address,
              amount,
              private_key: faucetPrivateKey,
            },
          ],
          id: 1,
        }),
        signal: AbortSignal.timeout(15_000), // 15s timeout
      })
    } catch (err) {
      console.error('[faucet] RPC unreachable:', err)
      return NextResponse.json(
        { success: false, error: 'Sentrix node unreachable — try again later' },
        { status: 503 }
      )
    }

    let rpcData: { result?: string; error?: { message?: string; code?: number } }
    try {
      rpcData = await rpcRes.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid response from Sentrix node' },
        { status: 502 }
      )
    }

    if (rpcData.error) {
      const errMsg = rpcData.error.message ?? 'Transaction rejected by node'
      console.error('[faucet] RPC error:', rpcData.error)
      return NextResponse.json(
        { success: false, error: errMsg },
        { status: 400 }
      )
    }

    const txHash = rpcData.result ?? ''

    // Record rate limit only after confirmed success
    recordRequest(ip)

    console.info(`[faucet] Sent ${amount} SRX to ${address} | tx: ${txHash} | ip: ${ip}`)

    return NextResponse.json({ success: true, txHash })
  } catch (err) {
    console.error('[faucet] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/faucet — faucet metadata (no sensitive data)
export async function GET() {
  return NextResponse.json({
    amount: parseInt(process.env.FAUCET_AMOUNT ?? '10', 10),
    chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? '7119', 10),
    faucetAddress: process.env.FAUCET_ADDRESS ?? '',
    cooldownHours: 24,
    status: 'active',
  })
}
