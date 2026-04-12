'use client'
import { useState, useEffect } from 'react'
import { Droplets, CheckCircle, AlertCircle, Clock, ExternalLink, Loader } from 'lucide-react'

type Status = 'idle' | 'loading' | 'success' | 'error' | 'cooldown'

export default function FaucetPage() {
  const [address, setAddress] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [txHash, setTxHash] = useState('')
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  const explorerUrl = process.env.NEXT_PUBLIC_EXPLORER_URL ?? 'https://sentrix-explorer.sentriscloud.com'
  const chainId = process.env.NEXT_PUBLIC_CHAIN_ID ?? '7119'

  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const t = setInterval(() => setCooldownSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldownSeconds])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const addr = address.trim()
    if (!addr) return

    setStatus('loading')
    setMessage('')
    setTxHash('')

    try {
      const res = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr }),
      })
      const data = await res.json()

      if (data.success) {
        setStatus('success')
        setTxHash(data.txHash ?? '')
        setMessage('10 SRX sent successfully!')
      } else if (data.cooldown) {
        setStatus('cooldown')
        setCooldownSeconds(data.cooldown)
        setMessage(data.error ?? 'Rate limit exceeded')
      } else {
        setStatus('error')
        setMessage(data.error ?? 'Request failed — please try again')
      }
    } catch {
      setStatus('error')
      setMessage('Network error — please try again')
    }
  }

  const formatCooldown = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}h ${m}m ${sec}s`
    if (m > 0) return `${m}m ${sec}s`
    return `${sec}s`
  }

  const isDisabled = status === 'loading' || !address.trim()

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16">

      {/* Background glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(200,168,74,0.06) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 w-full max-w-md animate-fade-up">

        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-[var(--gold)]/15 border border-[var(--brd2)] flex items-center justify-center animate-glow-pulse">
            <Droplets className="w-6 h-6 text-[var(--gold)]" />
          </div>
          <div>
            <h1 className="font-serif text-xl tracking-[.2em] uppercase text-[var(--tx)]">
              Sentrix <span className="text-[var(--gold)]">Faucet</span>
            </h1>
            <p className="text-[10px] text-[var(--tx-d)] tracking-[.15em] uppercase mt-0.5">
              Chain ID {chainId} · For Testing Only
            </p>
          </div>
        </div>

        {/* Main card */}
        <div className="bg-[var(--sf)] border border-[var(--brd)] rounded-2xl p-6 space-y-5">
          {/* Title */}
          <div className="text-center space-y-1.5">
            <p className="text-2xl font-black text-[var(--tx)] leading-tight">
              Get free SRX<br />
              <span className="text-[var(--gold)]">for testing</span>
            </p>
            <p className="text-sm text-[var(--tx-m)]">
              10 SRX per request · 1 request per 24 hours per IP
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-[var(--brd)]" />

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="0x... your wallet address"
                spellCheck={false}
                autoComplete="off"
                className="w-full bg-[var(--sf2)] border border-[var(--brd)] rounded-xl px-4 py-3 text-sm text-[var(--tx)] placeholder:text-[var(--tx-d)] font-mono focus:outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/20 transition-colors disabled:opacity-50"
                disabled={status === 'loading'}
              />
            </div>

            <button
              type="submit"
              disabled={isDisabled}
              className="w-full py-3 rounded-xl font-bold text-sm tracking-wide transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-[var(--gold)] text-[var(--bk)] hover:bg-[var(--gold-l)] active:scale-[.98]"
            >
              {status === 'loading' ? (
                <>
                  <Loader className="w-4 h-4 animate-spin-slow" />
                  Sending...
                </>
              ) : (
                <>
                  <Droplets className="w-4 h-4" />
                  Request 10 SRX
                </>
              )}
            </button>
          </form>

          {/* Status messages */}
          {status === 'success' && (
            <div className="flex items-start gap-3 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-emerald-400 font-semibold">10 SRX sent!</p>
                {txHash && (
                  <a
                    href={`${explorerUrl}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-emerald-500/80 hover:text-emerald-300 mt-1 font-mono transition-colors"
                  >
                    <span className="truncate max-w-[200px]">{txHash}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                )}
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-start gap-3 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{message}</p>
            </div>
          )}

          {status === 'cooldown' && (
            <div className="flex items-start gap-3 p-3.5 bg-orange-500/10 border border-orange-500/20 rounded-xl">
              <Clock className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-orange-400 font-semibold">Rate limit reached</p>
                {cooldownSeconds > 0 && (
                  <p className="text-xs text-orange-400/70 mt-0.5 font-mono">
                    Next request in {formatCooldown(cooldownSeconds)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-3">
          {[
            { value: '10 SRX', label: 'per request' },
            { value: '24h', label: 'cooldown' },
            { value: 'Free', label: 'no sign-up' },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-[var(--sf)] border border-[var(--brd)] rounded-xl p-3 text-center"
            >
              <p className="text-base font-black text-[var(--gold)]">{s.value}</p>
              <p className="text-[10px] text-[var(--tx-d)] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-5 space-y-1">
          <p className="text-xs text-[var(--tx-d)]">
            Powered by{' '}
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--gold)]/70 hover:text-[var(--gold)] transition-colors"
            >
              Sentrix Chain
            </a>
            {' '}· For testing only · Not real value
          </p>
        </div>
      </div>
    </div>
  )
}
