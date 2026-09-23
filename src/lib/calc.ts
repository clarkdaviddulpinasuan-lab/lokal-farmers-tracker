export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function fmtMoney(n: number): string {
  const r = round2(n)
  return `₱${r.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function fmtNum(n: number): string {
  const r = round2(n)
  return r.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export function fmtPrice(n: number, unit: string): string {
  return `${fmtMoney(n)} / ${unit}`
}

export function potentialValue(batch: { originalQuantity: number; marketPrice: number }): number {
  return round2(batch.originalQuantity * batch.marketPrice)
}

export function batchRemaining(batch: {
  originalQuantity: number
  quantitySold: number
  quantityReturned: number
  quantityWasted: number
}): number {
  return round2(batch.originalQuantity - batch.quantitySold - batch.quantityReturned - batch.quantityWasted)
}

export function saleSubtotal(sale: { quantity: number; unitPrice: number }): number {
  return round2(sale.quantity * sale.unitPrice)
}

export function farmerShareFor(
  quantity: number,
  farmerUnitPrice: number,
): number {
  return round2(quantity * farmerUnitPrice)
}

export function labFeeFor(quantity: number, labUnitFee: number): number {
  return round2(quantity * labUnitFee)
}

export function markdownFor(quantity: number, marketUnitPrice: number): number {
  return round2(quantity * marketUnitPrice)
}

export function sellThrough(original: number, sold: number): number {
  return original <= 0 ? 0 : Math.min(100, round2((sold / original) * 100))
}

export function initials(first: string, last: string): string {
  return `${(first[0] ?? '').toUpperCase()}${(last[0] ?? '').toUpperCase()}`
}

export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function nowISO(): string {
  const d = new Date()
  const h = `${d.getHours()}`.padStart(2, '0')
  const min = `${d.getMinutes()}`.padStart(2, '0')
  return `${toISO(d)}T${h}:${min}`
}

export function daysAgo(n: number, hour = 9, minute = 30): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, minute, 0, 0)
  const h = `${d.getHours()}`.padStart(2, '0')
  const min = `${d.getMinutes()}`.padStart(2, '0')
  return `${toISO(d)}T${h}:${min}`
}

export function startOfToday(): string {
  return `${toISO(new Date())}T00:00`
}

export function dayLabel(iso: string): string {
  return iso.slice(0, 10)
}

export function fmtWhen(iso: string): string {
  const now = new Date()
  const date = new Date(iso)
  const today = toISO(now)
  const someDate = toISO(date)
  if (someDate === today) {
    return `Today, ${iso.slice(11, 16)}`
  }
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (someDate === toISO(yesterday)) {
    return `Yesterday, ${iso.slice(11, 16)}`
  }
  return `${date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}, ${iso.slice(11, 16)}`
}

export function humanDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export function shortDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

let seq = 0
export function nextId(): string {
  seq += 1
  return seq.toString(36) + Math.random().toString(36).slice(2, 8)
}