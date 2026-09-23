import type { CSSProperties, ReactNode } from 'react'
import { fmtMoney, initials } from '../lib/calc'

type Tone = 'violet' | 'green' | 'amber' | 'red' | 'gray' | 'blue'

const TONES: Record<string, Tone> = {
  Available: 'green',
  'At Hub': 'violet',
  Pending: 'gray',
  Reserved: 'amber',
  'Partially Sold': 'amber',
  Sold: 'violet',
  Returned: 'gray',
  'Partially Returned': 'red',
  Closed: 'gray',
  Draft: 'gray',
  Received: 'violet',
  Verified: 'blue',
  Transferred: 'violet',
  Completed: 'green',
  Cancelled: 'red',
  Requested: 'amber',
  Confirmed: 'violet',
  Fulfilled: 'green',
  'Partially Fulfilled': 'blue',
  Cash: 'green',
  'On credit': 'amber',
  Active: 'green',
  Inactive: 'gray',
}

function statusTone(status: string): Tone {
  return TONES[status] ?? 'gray'
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status stats-${statusTone(status)}`}>
      <i />
      {status}
    </span>
  )
}

export function Avatar({ first, last, size = 32 }: { first: string; last: string; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.32 }}>
      {initials(first, last)}
    </span>
  )
}

export function ProductEmoji({ emoji, product }: { emoji: string; product: string }) {
  return (
    <span className="product-emoji" role="img" aria-label={product}>
      {emoji}
    </span>
  )
}

export interface MetricCardProps {
  label: string
  value: string
  icon: ReactNode
  tone: Tone
  meta: ReactNode
}

const ICON_TONES: Record<Tone, string> = {
  violet: 'violet',
  green: 'green',
  amber: 'amber',
  red: 'red',
  gray: 'blue',
  blue: 'blue',
}

export function MetricCard({ label, value, icon, tone, meta }: MetricCardProps) {
  return (
    <article className="kpi-card">
      <div className="kpi-top">
        <span>{label}</span>
        <span className={`kpi-icon ${ICON_TONES[tone]}`}>{icon}</span>
      </div>
      <strong>{value}</strong>
      <div className="kpi-meta">{meta}</div>
    </article>
  )
}

export function PageHeading({ eyebrow, title, subtitle, actions }: { eyebrow: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {subtitle && <p className="subheading">{subtitle}</p>}
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </div>
  )
}

export function Modal({ eyebrow, title, copy, onClose, children }: { eyebrow: string; title: string; copy?: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="quick-modal" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-top">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close dialog">
            ×
          </button>
        </div>
        {copy && <p className="modal-copy">{copy}</p>}
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label>
      {label}
      {children}
    </label>
  )
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="form-error">{message}</p>
}

export function EmptyState({ icon, title, copy }: { icon: string; title: string; copy: string }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <b>{title}</b>
      <p>{copy}</p>
    </div>
  )
}

export function ProgressBar({ pct, tone = 'violet' }: { pct: number; tone?: Tone }) {
  return (
    <div className="demand-bar">
      <span className={`bar-${tone}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  )
}

export interface TrendChartProps {
  points: { label: string; actual: number; potential: number }[]
}

function niceTop(max: number): number {
  if (max <= 0) return 1
  const mag = 10 ** Math.floor(Math.log10(max))
  const norm = max / mag
  const top = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
  return top * mag
}

function formatTick(v: number): string {
  if (v >= 1000) {
    const k = v / 1000
    return `₱${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`
  }
  return `${fmtMoney(v)}`
}

function buildPath(values: number[], top: number, width: number, height: number): string {
  if (values.length === 0) return ''
  const n = values.length
  const step = width / (n - 1 || 1)
  return values
    .map((v, i) => {
      const x = i * step
      const y = height - Math.min(1, v / top) * (height - 18)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

export function TrendChart({ points }: TrendChartProps) {
  const width = 700
  const height = 210
  const all = [...points.map((p) => p.actual), ...points.map((p) => p.potential)]
  const top = niceTop(Math.max(...all, 1))
  const line = buildPath(points.map((p) => p.actual), top, width, height)
  const area = line ? `${line} L${width},210 L0,210 Z` : ''
  const potentialLine = buildPath(points.map((p) => p.potential), top, width, height)
  const ticks = [0, 1, 2, 3].map((i) => {
    const value = (top / 3) * (3 - i)
    const y = ((height - 18) * i) / 3 + 4
    return { y: Math.round(y), value }
  })
  return (
    <div className="chart">
      <div className="chart-y">{ticks.map((t) => <span key={t.y}>{formatTick(t.value)}</span>)}</div>
      <div className="chart-area">
        {ticks.map((t) => (
          <div key={t.y} className="grid-line-chart" style={{ top: t.y } as CSSProperties} />
        ))}
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Sales trend chart (actual vs potential)">
          <defs>
            <linearGradient id="chartFillL" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#7567f8" stopOpacity=".2" />
              <stop offset="100%" stopColor="#7567f8" stopOpacity="0" />
            </linearGradient>
          </defs>
          {area && <path d={area} fill="url(#chartFillL)" />}
          <path d={line || 'M0,210'} fill="none" stroke="#7567f8" strokeWidth="3" strokeLinecap="round" />
          <path d={potentialLine || 'M0,210'} fill="none" stroke="#c9c4ff" strokeWidth="2" strokeDasharray="5 7" strokeLinecap="round" />
        </svg>
        <div className="chart-x">{points.map((p) => (<span key={p.label}>{p.label}</span>))}</div>
      </div>
    </div>
  )
}