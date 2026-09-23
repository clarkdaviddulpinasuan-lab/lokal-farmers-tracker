import { useSyncExternalStore } from 'react'
import type {
  AppState, AuditEntry, Batch, ConsignmentStatus, Delivery, DeliveryGroup, Farmer,
  FarmerAllocation, Member, Notification, Order, OrderItem, Preorder, Product,
  ReturnRecord, ReturnRequest, ReturnRequestItem, Sale, Settlement, Session, Hub,
} from '../types'
import { buildSeed } from './seed'
import {
  batchRemaining, daysAgo, farmerShareFor, fmtNum, labFeeFor, nextId, nowISO, potentialValue,
  round2, saleSubtotal, sellThrough, startOfToday, toISO,
} from './calc'
import { isSupabaseEnabled, supabase } from './supabase'

let state: AppState = buildSeed()

const listeners = new Set<() => void>()
function emit() {
  for (const listener of listeners) listener()
}
function getState(): AppState {
  return state
}
function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState)
}

function commit(next: AppState) {
  state = next
  emit()
}

function currentState(): AppState {
  return state
}

function errMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    const m = (err as { message: string }).message
    if (m.startsWith('permission denied')) return 'You do not have permission to perform this action.'
    return m.replace(/^Could not find the function/, 'RPC missing — run migrations: Could not find the function')
  }
  return fallback
}

function codeFromIds(list: { id: string }[], prefix: string, pad = 3): string {
  let max = 0
  for (const item of list) {
    const m = /-(\d+)$/.exec(item.id)
    if (m) max = Math.max(max, Number.parseInt(m[1], 10))
  }
  return `${prefix}-${String(max + 1).padStart(pad, '0')}`
}

function currentMemberName(): string {
  const s = currentState()
  if (!s.session) return 'System'
  const m = s.members.find((mb) => mb.id === s.session!.memberId)
  return m ? `${m.firstName} ${m.lastName}` : 'System'
}

function auditEntry(entityType: string, entityId: string, action: string, detail: string): AuditEntry {
  return { id: nextId(), timestamp: nowISO(), action, entityType, entityId, detail, by: currentMemberName() }
}

function recomputeBatchStatus(batch: Batch, sold: number, returned: number, wasted: number): ConsignmentStatus {
  const remaining = round2(batch.originalQuantity - sold - returned - wasted)
  if (remaining <= 0) {
    if (returned >= batch.originalQuantity) return 'Returned'
    if (returned > 0 || wasted > 0) return 'Closed'
    return 'Sold'
  }
  if (sold > 0) return 'Partially Sold'
  return batch.status
}

// ── Supabase load / auth / realtime ─────────────────────────────────────────

type Row = Record<string, unknown>

function s(v: unknown): string {
  return v == null ? '' : String(v)
}
function n(v: unknown): number {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}
function b(v: unknown): boolean {
  return v === true
}
function iso(v: unknown): string {
  if (!v) return ''
  const d = new Date(String(v))
  if (Number.isNaN(d.getTime())) return String(v)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function dateOnly(v: unknown): string {
  if (!v) return ''
  return String(v).slice(0, 10)
}

function mapHub(r: Row): Hub {
  return { id: s(r.id), hubCode: s(r.hub_code), name: s(r.name), municipality: s(r.municipality), status: s(r.status) as Hub['status'], createdAt: iso(r.created_at) }
}
function mapFarmer(r: Row): Farmer {
  return {
    id: s(r.id), farmerCode: s(r.farmer_code), firstName: s(r.first_name), lastName: s(r.last_name),
    age: n(r.age), gender: s(r.gender), address: s(r.address), barangay: s(r.barangay),
    municipality: s(r.municipality), phone: s(r.phone), status: s(r.status) as Farmer['status'],
    createdAt: iso(r.created_at), notes: r.notes ? s(r.notes) : undefined,
  }
}
function mapProduct(r: Row): Product {
  return { id: s(r.id), name: s(r.name), category: s(r.category), defaultUnit: s(r.default_unit), emoji: s(r.emoji) }
}
function mapMember(r: Row): Member {
  return {
    id: s(r.id), memberCode: s(r.member_code), firstName: s(r.first_name), lastName: s(r.last_name),
    email: s(r.email), password: '', role: s(r.role) as Member['role'], hubId: r.hub_id ? s(r.hub_id) : null,
    status: s(r.status) as Member['status'], createdAt: iso(r.created_at), updatedAt: iso(r.updated_at),
  }
}
function mapGroup(r: Row): DeliveryGroup {
  return {
    id: s(r.id), groupCode: s(r.group_code), originHubId: s(r.origin_hub_id),
    status: s(r.status) as DeliveryGroup['status'], createdBy: s(r.created_by),
    sentBy: r.sent_by ? s(r.sent_by) : undefined, sentAt: r.sent_at ? iso(r.sent_at) : undefined,
    receivedBy: r.received_by ? s(r.received_by) : undefined, receivedAt: r.received_at ? iso(r.received_at) : undefined,
    createdAt: iso(r.created_at),
  }
}
function mapDelivery(r: Row): Delivery {
  return {
    id: s(r.id), deliveryCode: s(r.delivery_code), farmerId: s(r.farmer_id),
    deliveryDate: iso(r.delivery_date), collectionLocation: s(r.collection_location),
    receivedBy: s(r.received_by), status: s(r.status) as Delivery['status'],
    originHubId: s(r.origin_hub_id), openedBy: r.opened_by ? s(r.opened_by) : '',
    groupId: r.group_id ? s(r.group_id) : null,
  }
}
function mapBatch(r: Row): Batch {
  return {
    id: s(r.id), batchCode: s(r.batch_code), deliveryId: s(r.delivery_id), productId: s(r.product_id),
    farmerId: s(r.farmer_id), originalQuantity: n(r.original_quantity), quantitySold: n(r.quantity_sold),
    quantityReturned: n(r.quantity_returned), quantityWasted: n(r.quantity_wasted), unit: s(r.unit),
    qualityGrade: s(r.quality_grade), farmerPrice: n(r.farmer_price), labFee: n(r.lab_fee),
    marketPrice: n(r.market_price), status: s(r.status) as ConsignmentStatus, receivedAt: iso(r.received_at),
  }
}
function mapSale(r: Row): Sale {
  return {
    id: s(r.id), saleCode: s(r.sale_code), batchId: s(r.batch_id), productId: s(r.product_id),
    farmerId: s(r.farmer_id), quantity: n(r.quantity), unit: s(r.unit), unitPrice: n(r.unit_price),
    buyerName: s(r.buyer_name), paymentMethod: s(r.payment_method) as Sale['paymentMethod'],
    paymentSettled: b(r.payment_settled), soldAt: iso(r.sold_at), recordedBy: s(r.recorded_by),
    orderId: r.order_id ? s(r.order_id) : undefined,
  }
}
function mapReturn(r: Row): ReturnRecord {
  return {
    id: s(r.id), returnCode: s(r.return_code), batchId: s(r.batch_id), quantity: n(r.quantity),
    unit: s(r.unit), reason: s(r.reason), condition: s(r.condition), returnedAt: iso(r.returned_at),
    recordedBy: s(r.recorded_by),
  }
}
function mapSettlement(r: Row): Settlement {
  let items: Settlement['items'] = []
  try {
    items = typeof r.items === 'string' ? JSON.parse(r.items) : ((r.items as Settlement['items']) ?? [])
  } catch {
    items = []
  }
  return {
    id: s(r.id), settlementCode: s(r.settlement_code), farmerId: s(r.farmer_id),
    periodStart: dateOnly(r.period_start), periodEnd: dateOnly(r.period_end), items,
    totalSales: n(r.total_sales), adjustments: n(r.adjustments), payable: n(r.payable),
    status: s(r.status) as Settlement['status'], paidAt: r.paid_at ? iso(r.paid_at) : undefined,
    paymentMethod: r.payment_method ? s(r.payment_method) : undefined, createdAt: iso(r.created_at),
  }
}
function mapOrder(r: Row, items: OrderItem[]): Order {
  return {
    id: s(r.id), orderCode: s(r.order_code), buyerName: s(r.buyer_name), items,
    totalRevenue: n(r.total_revenue), paymentMethod: s(r.payment_method) as Order['paymentMethod'],
    status: s(r.status) as Order['status'], createdAt: iso(r.created_at), recordedBy: s(r.recorded_by),
  }
}
function mapOrderItem(r: Row): OrderItem {
  return {
    id: s(r.id), productId: s(r.product_id), quantity: n(r.quantity), unit: s(r.unit),
    unitPrice: n(r.unit_price), lineTotal: n(r.line_total),
  }
}
function mapReturnRequest(r: Row, items: ReturnRequestItem[]): ReturnRequest {
  return {
    id: s(r.id), returnCode: s(r.return_code), orderId: s(r.order_id), items,
    returnType: s(r.return_type) as ReturnRequest['returnType'], reason: s(r.reason), notes: s(r.notes),
    status: s(r.status) as ReturnRequest['status'], requestedBy: s(r.requested_by_name) || s(r.requested_by),
    reviewedBy: r.reviewed_by ? s(r.reviewed_by) : undefined,
    reviewNote: r.review_note != null && r.review_note !== '' ? s(r.review_note) : undefined,
    reviewedAt: r.reviewed_at ? iso(r.reviewed_at) : undefined, createdAt: iso(r.created_at),
  }
}
function mapReturnItem(r: Row): ReturnRequestItem {
  return { id: s(r.id), productId: s(r.product_id), quantity: n(r.quantity), unit: s(r.unit) }
}
function mapAllocation(r: Row): FarmerAllocation {
  return {
    id: s(r.id), orderItemId: s(r.order_item_id), batchId: s(r.batch_id), farmerId: s(r.farmer_id),
    productId: s(r.product_id), allocatedQuantity: n(r.allocated_quantity), farmerPayout: n(r.farmer_payout),
    createdAt: iso(r.created_at),
  }
}
function mapNotification(r: Row): Notification {
  return {
    id: s(r.id), type: s(r.type) as Notification['type'], title: s(r.title), message: s(r.message),
    targetMemberId: s(r.target_member_id), relatedEntityType: s(r.related_entity_type),
    relatedEntityId: s(r.related_entity_id), read: b(r.read), createdAt: iso(r.created_at),
  }
}
function mapAudit(r: Row): AuditEntry {
  return {
    id: s(r.id), timestamp: iso(r.created_at), action: s(r.action), entityType: s(r.entity_type),
    entityId: s(r.entity_id), detail: s(r.detail), by: s(r.by_name),
  }
}
function mapPreorder(r: Row): Preorder {
  let items: Preorder['items'] = []
  try {
    items = typeof r.items === 'string' ? JSON.parse(r.items) : ((r.items as Preorder['items']) ?? [])
  } catch {
    items = []
  }
  return {
    id: s(r.id), buyerName: s(r.buyer_name), requestedDate: dateOnly(r.requested_date),
    status: s(r.status) as Preorder['status'], items,
  }
}

async function selectAll(table: string): Promise<Row[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from(table).select('*')
  if (error) throw new Error(errMessage(error, `Failed to load ${table}`))
  return (data ?? []) as Row[]
}

async function loadProfiles(): Promise<Row[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('list_profiles')
  if (!error && Array.isArray(data)) return data as Row[]
  const { data: rows, error: tableErr } = await supabase.from('profiles').select('*')
  if (tableErr) throw new Error(errMessage(tableErr, 'Failed to load profiles'))
  return (rows ?? []) as Row[]
}

let loadSeq = 0
async function loadAll(): Promise<void> {
  if (!supabase) return
  const seq = ++loadSeq
  try {
    const [
      hubs, profiles, farmers, products, groups, deliveries, batches,
      orders, orderItems, allocations, sales, returns, returnReqs, returnItems,
      settlements, preorders, notifications, audit,
    ] = await Promise.all([
      selectAll('hubs'), loadProfiles(),
      selectAll('farmers'), selectAll('products'), selectAll('delivery_groups'),
      selectAll('deliveries'), selectAll('batches'), selectAll('orders'), selectAll('order_items'),
      selectAll('farmer_allocations'), selectAll('sales'), selectAll('return_records'),
      selectAll('return_requests'), selectAll('return_items'), selectAll('settlements'),
      selectAll('preorders'), selectAll('notifications'), selectAll('audit_logs').catch(() => [] as Row[]),
    ])
    if (seq !== loadSeq) return

    const orderItemsBy = new Map<string, OrderItem[]>()
    for (const row of orderItems) {
      const oid = s(row.order_id)
      const list = orderItemsBy.get(oid) ?? []
      list.push(mapOrderItem(row))
      orderItemsBy.set(oid, list)
    }
    const rrItemsBy = new Map<string, ReturnRequestItem[]>()
    for (const row of returnItems) {
      const rid = s(row.return_request_id)
      const list = rrItemsBy.get(rid) ?? []
      list.push(mapReturnItem(row))
      rrItemsBy.set(rid, list)
    }

    const session = state.session
    commit({
      ...state,
      hubs: hubs.map(mapHub),
      members: profiles.map(mapMember),
      farmers: farmers.map(mapFarmer),
      products: products.map(mapProduct),
      deliveryGroups: groups.map(mapGroup),
      deliveries: deliveries.map(mapDelivery),
      batches: batches.map(mapBatch),
      orders: orders.map((row) => mapOrder(row, orderItemsBy.get(s(row.id)) ?? [])),
      farmerAllocations: allocations.map(mapAllocation),
      sales: sales.map(mapSale),
      returns: returns.map(mapReturn),
      returnRequests: returnReqs.map((row) => mapReturnRequest(row, rrItemsBy.get(s(row.id)) ?? [])),
      settlements: settlements.map(mapSettlement),
      preorders: preorders.map(mapPreorder),
      notifications: notifications.map(mapNotification),
      audit: audit.map(mapAudit),
      session,
      dataReady: true,
      loadError: null,
      backend: 'supabase',
    })
  } catch (err) {
    if (seq !== loadSeq) return
    commit({ ...state, loadError: errMessage(err, 'Failed to load data'), dataReady: true })
  }
}

let refreshTimer: ReturnType<typeof setTimeout> | undefined
function scheduleRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    void loadAll()
  }, 300)
}

let channel: { unsubscribe: () => void } | null = null
function subscribeRealtime() {
  if (!supabase || channel) return
  const client = supabase
  const ch = client
    .channel('lokal-db-changes')
    .on('postgres_changes', { event: '*', schema: 'public' }, () => scheduleRefresh())
    .subscribe()
  channel = { unsubscribe: () => { void client.removeChannel(ch) } }
}

let authInitialized = false
export async function initAuth(): Promise<void> {
  if (authInitialized) return
  authInitialized = true

  if (!isSupabaseEnabled || !supabase) {
    commit({ ...state, backend: 'local', authReady: true, dataReady: true })
    return
  }

  supabase.auth.onAuthStateChange((event, session) => {
    void handleAuthEvent(event, session?.user?.id ?? null)
  })

  const { data } = await supabase.auth.getSession()
  await handleAuthEvent('INITIAL_SESSION', data.session?.user?.id ?? null)
}

async function handleAuthEvent(_event: string, userId: string | null): Promise<void> {
  if (!userId) {
    if (channel) {
      channel.unsubscribe()
      channel = null
    }
    const fresh = buildSeed()
    commit({ ...fresh, backend: 'supabase', authReady: true, dataReady: true, loadError: null })
    return
  }

  const session: Session = { memberId: userId, signedInAt: nowISO() }
  commit({ ...state, session, authReady: true })
  await loadAll()
  subscribeRealtime()
}

async function afterMutation(): Promise<void> {
  if (isSupabaseEnabled) await loadAll()
}

async function rpc(name: string, args: Record<string, unknown>): Promise<unknown> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw new Error(errMessage(error, 'Request failed.'))
  return data
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<Member> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(errMessage(error, 'Invalid email or password.'))
    const userId = data.user?.id
    if (!userId) throw new Error('Invalid email or password.')
    const { data: profile, error: pErr } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (pErr || !profile) throw new Error('Profile not found for this account.')
    const member = mapMember(profile as Row)
    const session: Session = { memberId: userId, signedInAt: nowISO() }
    commit({ ...state, session, authReady: true })
    await loadAll()
    subscribeRealtime()
    return member
  }

  const s0 = currentState()
  const member = s0.members.find((m) => m.email === email && m.password === password && m.status === 'Active')
  if (!member) throw new Error('Invalid email or password.')
  commit({ ...s0, session: { memberId: member.id, signedInAt: nowISO() }, dataReady: true })
  return member
}

/** null = probe failed (RPC missing / network); false = not needed; true = empty profiles */
export async function needsSetup(): Promise<boolean | null> {
  if (!isSupabaseEnabled || !supabase) return false
  try {
    const data = await rpc('needs_setup', {})
    return Boolean(data)
  } catch {
    return null
  }
}

export const INVITE_ONLY_MESSAGE =
  'Registration is invite-only. Ask your Admin to add you from Members, then sign in with your email and password.'

export async function createFirstAdmin(input: {
  email: string
  password: string
  firstName: string
  lastName: string
}): Promise<Member> {
  await rpc('create_first_admin', {
    p_email: input.email,
    p_password: input.password,
    p_first_name: input.firstName,
    p_last_name: input.lastName,
  })
  return await login(input.email, input.password)
}

/** Public create: first Admin only while profiles is empty; otherwise invite-only. */
export async function createAccount(input: {
  email: string
  password: string
  firstName: string
  lastName: string
}): Promise<Member> {
  const needed = await needsSetup()
  if (needed === null) {
    throw new Error('Could not check account setup. Run supabase/reset_demo_data.sql (or lokalink_full_setup.sql), then reload.')
  }
  if (!needed) {
    throw new Error(INVITE_ONLY_MESSAGE)
  }
  return await createFirstAdmin(input)
}

export async function logout(): Promise<void> {
  if (isSupabaseEnabled && supabase) {
    await supabase.auth.signOut()
    if (channel) {
      channel.unsubscribe()
      channel = null
    }
  }
  const fresh = buildSeed()
  commit({
    ...fresh,
    backend: isSupabaseEnabled ? 'supabase' : 'local',
    authReady: true,
    dataReady: true,
    loadError: null,
  })
}

export function currentMember(s: AppState): Member | undefined {
  if (!s.session) return undefined
  return s.members.find((m) => m.id === s.session!.memberId)
}

// ── Delivery group flow ─────────────────────────────────────────────────────

export interface CreateDeliveryGroupInput {
  items: {
    farmerId: string
    productId: string
    quantity: number
    unit: string
    qualityGrade: string
    farmerPrice: number
    labFee: number
    marketPrice: number
  }[]
  collectionLocation: string
}

export interface CreateDeliveryGroupResult {
  groupId: string
  groupCode: string
}

function ensurePendingGroup(s: AppState, hubId: string, memberId: string): { group: DeliveryGroup; groups: DeliveryGroup[] } {
  const existing = s.deliveryGroups.find((g) => g.originHubId === hubId && g.status === 'Pending')
  if (existing) return { group: existing, groups: s.deliveryGroups }
  const group: DeliveryGroup = {
    id: nextId(),
    groupCode: codeFromIds(s.deliveryGroups, 'GRP'),
    originHubId: hubId,
    status: 'Pending',
    createdBy: memberId,
    createdAt: nowISO(),
  }
  return { group, groups: [...s.deliveryGroups, group] }
}

export async function createDeliveryGroup(input: CreateDeliveryGroupInput): Promise<CreateDeliveryGroupResult> {
  if (input.items.length === 0) throw new Error('Add at least one product entry.')
  for (const it of input.items) {
    if (!it.farmerId) throw new Error('Each farmer entry needs a farmer selected.')
    if (!it.productId) throw new Error('Each product entry needs a product selected.')
    if (!(it.quantity > 0)) throw new Error('Quantity must be greater than zero for every product.')
  }

  if (isSupabaseEnabled) {
    const payload = input.items.map((it) => ({
      farmer_id: it.farmerId,
      product_id: it.productId,
      quantity: String(it.quantity),
      unit: it.unit,
      quality_grade: it.qualityGrade,
      farmer_price: String(it.farmerPrice),
      lab_fee: String(it.labFee),
      market_price: String(it.marketPrice),
    }))
    const data = (await rpc('create_delivery_group', {
      p_items: payload,
      p_collection_location: input.collectionLocation,
    })) as { group_id?: string; group_code?: string } | null
    await afterMutation()
    return { groupId: s(data?.group_id), groupCode: s(data?.group_code) }
  }

  const s0 = currentState()
  const member = currentMember(s0)
  const hubId = member?.hubId ?? 'hub-a'
  const { group, groups } = ensurePendingGroup(s0, hubId, s0.session?.memberId ?? '')
  const deliveries = [...s0.deliveries]
  const batches = [...s0.batches]
  const audit = [...s0.audit]
  const farmerDelivery = new Map<string, string>()
  const today = toISO(new Date()).replaceAll('-', '')
  let maxSeq = 0
  for (const batch of batches) {
    const m = /-(\d+)$/.exec(batch.batchCode)
    if (m) maxSeq = Math.max(maxSeq, Number.parseInt(m[1], 10))
  }
  let seq = maxSeq

  for (const it of input.items) {
    const farmer = s0.farmers.find((f) => f.id === it.farmerId)
    if (!farmer) throw new Error('Choose an active farmer.')
    let deliveryId = farmerDelivery.get(it.farmerId)
    if (!deliveryId) {
      deliveryId = nextId()
      const delivery: Delivery = {
        id: deliveryId,
        deliveryCode: codeFromIds([...deliveries, { id: deliveryId }], 'DLV', 5),
        farmerId: it.farmerId,
        deliveryDate: nowISO(),
        collectionLocation: input.collectionLocation,
        receivedBy: currentMemberName(),
        status: 'Draft',
        originHubId: hubId,
        openedBy: s0.session?.memberId ?? '',
        groupId: group.id,
      }
      deliveries.push(delivery)
      farmerDelivery.set(it.farmerId, deliveryId)
      audit.push(auditEntry('Delivery', deliveryId, 'Delivery created', `${fmtNum(it.quantity)} ${it.unit} from ${farmer.firstName} ${farmer.lastName}`))
    }
    seq += 1
    const batch: Batch = {
      id: nextId(),
      batchCode: `KL-${today}-${String(seq).padStart(5, '0')}`,
      deliveryId,
      productId: it.productId,
      farmerId: it.farmerId,
      originalQuantity: it.quantity,
      quantitySold: 0,
      quantityReturned: 0,
      quantityWasted: 0,
      unit: it.unit,
      qualityGrade: it.qualityGrade,
      farmerPrice: it.farmerPrice,
      labFee: it.labFee,
      marketPrice: it.marketPrice,
      status: 'Pending',
      receivedAt: nowISO(),
    }
    batches.push(batch)
    audit.push(auditEntry('Batch', batch.id, 'Consignment created', `${batch.batchCode} · potential ${fmtNum(potentialValue(batch))}`))
  }

  commit({ ...s0, deliveryGroups: groups, deliveries, batches, audit })
  return { groupId: group.id, groupCode: group.groupCode }
}

export async function sendDeliveryGroup(groupId: string): Promise<void> {
  if (isSupabaseEnabled) {
    await rpc('send_delivery_group', { p_group_id: groupId })
    await afterMutation()
    return
  }
  const s0 = currentState()
  const group = s0.deliveryGroups.find((g) => g.id === groupId)
  if (!group) throw new Error('Delivery group not found.')
  if (group.status !== 'Pending') throw new Error('Only pending groups can be sent.')
  const updatedGroup: DeliveryGroup = { ...group, status: 'On the Way', sentBy: currentMemberName(), sentAt: nowISO() }
  const updatedDeliveries = s0.deliveries.map((d) => (d.groupId === groupId ? { ...d, status: 'On the Way' as const } : d))
  const updatedBatches = s0.batches.map((batch) => {
    const del = s0.deliveries.find((d) => d.id === batch.deliveryId)
    if (del?.groupId === groupId && (batch.status === 'Pending' || batch.status === 'At Hub')) {
      return { ...batch, status: 'At Hub' as const }
    }
    return batch
  })
  const staffB = s0.members.find((m) => m.role === 'Staff B' && m.status === 'Active')
  const notifs: Notification[] = staffB
    ? [{
        id: nextId(), type: 'delivery_incoming', title: 'Delivery incoming',
        message: `Group ${group.groupCode} is on the way from ${s0.hubs.find((h) => h.id === group.originHubId)?.name ?? 'Hub A'}`,
        targetMemberId: staffB.id, relatedEntityType: 'DeliveryGroup', relatedEntityId: groupId,
        read: false, createdAt: nowISO(),
      }]
    : []
  const audit = auditEntry('DeliveryGroup', groupId, 'Delivery group sent', group.groupCode)
  commit({
    ...s0,
    deliveryGroups: s0.deliveryGroups.map((g) => (g.id === groupId ? updatedGroup : g)),
    deliveries: updatedDeliveries,
    batches: updatedBatches,
    notifications: [...s0.notifications, ...notifs],
    audit: [...s0.audit, audit],
  })
}

export async function receiveDeliveryGroup(groupId: string): Promise<void> {
  if (isSupabaseEnabled) {
    await rpc('receive_delivery_group', { p_group_id: groupId })
    await afterMutation()
    return
  }
  const s0 = currentState()
  const group = s0.deliveryGroups.find((g) => g.id === groupId)
  if (!group) throw new Error('Delivery group not found.')
  if (group.status !== 'On the Way') throw new Error('Only groups on the way can be received.')
  const receiver = currentMemberName()
  const updatedGroup: DeliveryGroup = { ...group, status: 'Received', receivedBy: receiver, receivedAt: nowISO() }
  const updatedDeliveries = s0.deliveries.map((d) =>
    d.groupId === groupId ? { ...d, status: 'Received' as const, receivedBy: receiver } : d,
  )
  const updatedBatches = s0.batches.map((batch) => {
    const del = s0.deliveries.find((d) => d.id === batch.deliveryId)
    if (del?.groupId === groupId) {
      return { ...batch, status: 'Available' as ConsignmentStatus }
    }
    return batch
  })
  const staffA = s0.members.find((m) => m.id === group.createdBy)
  const receivingMember = currentMember(s0)
  const receivingHub = receivingMember?.hubId ? s0.hubs.find((h) => h.id === receivingMember.hubId) : null
  const notifs: Notification[] = staffA
    ? [{
        id: nextId(), type: 'delivery_received', title: 'Delivery received',
        message: `Group ${group.groupCode} has been received at ${receivingHub?.name ?? 'the receiving hub'}`,
        targetMemberId: staffA.id, relatedEntityType: 'DeliveryGroup', relatedEntityId: groupId,
        read: false, createdAt: nowISO(),
      }]
    : []
  const audit = auditEntry('DeliveryGroup', groupId, 'Delivery group received', group.groupCode)
  commit({
    ...s0,
    deliveryGroups: s0.deliveryGroups.map((g) => (g.id === groupId ? updatedGroup : g)),
    deliveries: updatedDeliveries,
    batches: updatedBatches,
    notifications: [...s0.notifications, ...notifs],
    audit: [...s0.audit, audit],
  })
}

// ── Sales / returns / orders ────────────────────────────────────────────────

export interface RecordSaleInput {
  batchId: string
  quantity: number
  unitPrice: number
  buyerName: string
  paymentMethod: Sale['paymentMethod']
}

export async function recordSale(input: RecordSaleInput): Promise<Sale> {
  if (isSupabaseEnabled) {
    const data = (await rpc('record_sale', {
      p_batch_id: input.batchId,
      p_quantity: input.quantity,
      p_unit_price: input.unitPrice,
      p_buyer_name: input.buyerName,
      p_payment_method: input.paymentMethod,
    })) as Row | null
    await afterMutation()
    const created = currentState().sales.find((sl) => sl.id === s(data?.id))
    if (!created) throw new Error('Sale recorded but could not be reloaded.')
    return created
  }

  const s0 = currentState()
  const batch = s0.batches.find((x) => x.id === input.batchId)
  if (!batch) throw new Error('Batch not found.')
  const available = batchRemaining(batch)
  if (input.quantity <= 0) throw new Error('Sale quantity must be greater than zero.')
  if (input.quantity > available) {
    throw new Error(`Sale cannot exceed available quantity (${fmtNum(available)} ${batch.unit}).`)
  }
  const sale: Sale = {
    id: nextId(),
    saleCode: codeFromIds(s0.sales, 'SL', 5),
    batchId: batch.id,
    productId: batch.productId,
    farmerId: batch.farmerId,
    quantity: input.quantity,
    unit: batch.unit,
    unitPrice: input.unitPrice,
    buyerName: input.buyerName,
    paymentMethod: input.paymentMethod,
    paymentSettled: false,
    soldAt: nowISO(),
    recordedBy: currentMemberName(),
  }
  const nextSold = batch.quantitySold + input.quantity
  const updatedBatch: Batch = { ...batch, quantitySold: nextSold, status: recomputeBatchStatus(batch, nextSold, batch.quantityReturned, batch.quantityWasted) }
  const audit = auditEntry('Sale', sale.id, 'Sale recorded', `${fmtNum(sale.quantity)} ${sale.unit} sold to ${sale.buyerName}`)
  commit({
    ...s0,
    batches: s0.batches.map((x) => (x.id === batch.id ? updatedBatch : x)),
    sales: [...s0.sales, sale],
    audit: [...s0.audit, audit],
  })
  return sale
}

export interface RecordReturnInput {
  batchId: string
  quantity: number
  reason: string
  condition: string
}

export async function recordReturn(input: RecordReturnInput): Promise<ReturnRecord> {
  if (isSupabaseEnabled) {
    const data = (await rpc('record_return', {
      p_batch_id: input.batchId,
      p_quantity: input.quantity,
      p_reason: input.reason,
      p_condition: input.condition,
    })) as Row | null
    await afterMutation()
    const created = currentState().returns.find((r) => r.id === s(data?.id))
    if (!created) throw new Error('Return recorded but could not be reloaded.')
    return created
  }

  const s0 = currentState()
  const batch = s0.batches.find((x) => x.id === input.batchId)
  if (!batch) throw new Error('Batch not found.')
  const available = batchRemaining(batch)
  if (input.quantity <= 0) throw new Error('Return quantity must be greater than zero.')
  if (input.quantity > available) {
    throw new Error(`Return cannot exceed remaining quantity (${fmtNum(available)} ${batch.unit}).`)
  }
  const ret: ReturnRecord = {
    id: nextId(),
    returnCode: codeFromIds(s0.returns, 'RTN'),
    batchId: batch.id,
    quantity: input.quantity,
    unit: batch.unit,
    reason: input.reason,
    condition: input.condition,
    returnedAt: nowISO(),
    recordedBy: currentMemberName(),
  }
  const nextReturned = batch.quantityReturned + input.quantity
  const updatedBatch: Batch = { ...batch, quantityReturned: nextReturned, status: recomputeBatchStatus(batch, batch.quantitySold, nextReturned, batch.quantityWasted) }
  const audit = auditEntry('Return', ret.id, 'Return recorded', `${fmtNum(ret.quantity)} ${ret.unit} returned (${ret.reason})`)
  commit({
    ...s0,
    batches: s0.batches.map((x) => (x.id === batch.id ? updatedBatch : x)),
    returns: [...s0.returns, ret],
    audit: [...s0.audit, audit],
  })
  return ret
}

export interface AddFarmerInput {
  firstName: string
  lastName: string
  age: number
  gender: string
  address: string
  barangay: string
  municipality: string
  phone: string
}

export async function addFarmer(input: AddFarmerInput): Promise<void> {
  if (isSupabaseEnabled) {
    await rpc('add_farmer', {
      p_first_name: input.firstName,
      p_last_name: input.lastName,
      p_age: input.age,
      p_gender: input.gender,
      p_address: input.address,
      p_barangay: input.barangay,
      p_municipality: input.municipality,
      p_phone: input.phone,
    })
    await afterMutation()
    return
  }
  const s0 = currentState()
  let maxFarmer = 0
  for (const f of s0.farmers) {
    const m = /^F-(\d+)$/.exec(f.farmerCode)
    if (m) maxFarmer = Math.max(maxFarmer, Number.parseInt(m[1], 10))
  }
  const farmer: Farmer = {
    id: nextId(),
    farmerCode: `F-${String(maxFarmer + 1).padStart(5, '0')}`,
    firstName: input.firstName,
    lastName: input.lastName,
    age: input.age,
    gender: input.gender,
    address: input.address,
    barangay: input.barangay,
    municipality: input.municipality,
    phone: input.phone,
    status: 'Active',
    createdAt: nowISO(),
  }
  const audit = auditEntry('Farmer', farmer.id, 'Farmer created', `${farmer.firstName} ${farmer.lastName} (${farmer.farmerCode})`)
  commit({ ...s0, farmers: [...s0.farmers, farmer], audit: [...s0.audit, audit] })
}

export interface AddProductInput {
  name: string
  category: string
  defaultUnit: string
  emoji: string
}

export async function addProduct(input: AddProductInput): Promise<void> {
  if (isSupabaseEnabled) {
    await rpc('add_product', {
      p_name: input.name,
      p_category: input.category,
      p_default_unit: input.defaultUnit,
      p_emoji: input.emoji,
    })
    await afterMutation()
    return
  }
  const s0 = currentState()
  const existing = s0.products.find((p) => p.name.toLowerCase() === input.name.toLowerCase())
  if (existing) throw new Error('A product with this name already exists.')
  const product: Product = {
    id: `p-${nextId()}`,
    name: input.name,
    category: input.category,
    defaultUnit: input.defaultUnit,
    emoji: input.emoji,
  }
  const audit = auditEntry('Product', product.id, 'Product created', `${product.emoji} ${product.name} (${product.category})`)
  commit({ ...s0, products: [...s0.products, product], audit: [...s0.audit, audit] })
}

export async function generateSettlement(farmerId: string): Promise<Settlement | null> {
  if (isSupabaseEnabled) {
    const data = (await rpc('generate_settlement', { p_farmer_id: farmerId })) as Row | null
    await afterMutation()
    if (!data) return null
    return currentState().settlements.find((st) => st.id === s(data.id)) ?? null
  }

  const s0 = currentState()
  const unpaidSales = salesForSettlement(s0, farmerId)
  if (unpaidSales.length === 0) return null
  const items = unpaidSales.map((sale) => ({
    saleId: sale.id,
    batchCode: s0.batches.find((x) => x.id === sale.batchId)?.batchCode ?? '',
    productName: s0.products.find((pr) => pr.id === sale.productId)?.name ?? 'Product',
    quantity: sale.quantity,
    farmerPrice: s0.batches.find((x) => x.id === sale.batchId)?.farmerPrice ?? 0,
    farmerAmount: farmerShareFor(sale.quantity, s0.batches.find((x) => x.id === sale.batchId)?.farmerPrice ?? 0),
  }))
  const payable = round2(items.reduce((sum, it) => sum + it.farmerAmount, 0))
  const settlement: Settlement = {
    id: nextId(),
    settlementCode: codeFromIds(s0.settlements, 'ST'),
    farmerId,
    periodStart: daysAgo(7, 8),
    periodEnd: startOfToday(),
    items,
    totalSales: payable,
    adjustments: 0,
    payable,
    status: 'Approved',
    createdAt: nowISO(),
  }
  const audit = auditEntry('Settlement', settlement.id, 'Settlement generated', `${settlement.settlementCode} · ${fmtNum(payable)}`)
  commit({ ...s0, settlements: [...s0.settlements, settlement], audit: [...s0.audit, audit] })
  return settlement
}

export async function markPaid(settlementId: string, method: string): Promise<void> {
  if (isSupabaseEnabled) {
    await rpc('mark_paid', { p_settlement_id: settlementId, p_method: method })
    await afterMutation()
    return
  }
  const s0 = currentState()
  const settlement = s0.settlements.find((st) => st.id === settlementId)
  if (!settlement) return
  const saleIds = new Set(settlement.items.map((it) => it.saleId))
  const updatedSales = s0.sales.map((sale) => (saleIds.has(sale.id) ? { ...sale, paymentSettled: true } : sale))
  const updatedSettlements = s0.settlements.map((st) =>
    st.id === settlementId ? { ...st, status: 'Paid' as const, paidAt: nowISO(), paymentMethod: method } : st,
  )
  const audit = auditEntry('Settlement', settlementId, 'Settlement paid', `${settlement.settlementCode} marked as paid · ${method}`)
  commit({ ...s0, settlements: updatedSettlements, sales: updatedSales, audit: [...s0.audit, audit] })
}

export function paidSaleIds(s: AppState): Set<string> {
  const ids = new Set<string>()
  for (const st of s.settlements) {
    if (st.status === 'Paid') for (const it of st.items) ids.add(it.saleId)
  }
  return ids
}

export function farmerPendingPayable(s: AppState, farmerId: string): number {
  const paid = paidSaleIds(s)
  let total = 0
  for (const sale of s.sales) {
    if (sale.farmerId !== farmerId || paid.has(sale.id)) continue
    const batch = s.batches.find((x) => x.id === sale.batchId)
    total += farmerShareFor(sale.quantity, batch?.farmerPrice ?? 0)
  }
  return round2(total)
}

export function salesForSettlement(s: AppState, farmerId: string): Sale[] {
  const paid = paidSaleIds(s)
  return s.sales.filter((sale) => sale.farmerId === farmerId && !paid.has(sale.id))
}

// ── Members (Admin) ─────────────────────────────────────────────────────────

export interface AddMemberInput {
  firstName: string
  lastName: string
  email: string
  password: string
  role: 'Admin' | 'Staff A' | 'Staff B'
  hubId: string | null
}

export async function addMember(input: AddMemberInput): Promise<Member> {
  if (isSupabaseEnabled) {
    await rpc('admin_create_member', {
      p_email: input.email,
      p_password: input.password,
      p_first_name: input.firstName,
      p_last_name: input.lastName,
      p_role: input.role,
      p_hub_id: input.hubId,
    })
    await afterMutation()
    const created = currentState().members.find((m) => m.email === input.email)
    if (created) return created
    return {
      id: '', memberCode: '', firstName: input.firstName, lastName: input.lastName, email: input.email,
      password: '', role: input.role, hubId: input.hubId, status: 'Active', createdAt: nowISO(), updatedAt: nowISO(),
    }
  }

  const s0 = currentState()
  if (s0.members.some((m) => m.email === input.email)) throw new Error('A member with this email already exists.')
  if (input.role !== 'Admin' && !input.hubId) throw new Error('Staff members must be assigned to a hub.')
  let maxMember = 0
  for (const m of s0.members) {
    const match = /^MB-(\d+)$/.exec(m.memberCode)
    if (match) maxMember = Math.max(maxMember, Number.parseInt(match[1], 10))
  }
  const member: Member = {
    id: nextId(),
    memberCode: `MB-${String(maxMember + 1).padStart(3, '0')}`,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    password: input.password,
    role: input.role,
    hubId: input.hubId,
    status: 'Active',
    createdAt: nowISO(),
    updatedAt: nowISO(),
  }
  const audit = auditEntry('Member', member.id, 'Member created', `${member.firstName} ${member.lastName} (${member.role})`)
  commit({ ...s0, members: [...s0.members, member], audit: [...s0.audit, audit] })
  return member
}

export interface UpdateMemberInput {
  firstName?: string
  lastName?: string
  email?: string
  role?: 'Admin' | 'Staff A' | 'Staff B'
  hubId?: string | null
}

export async function updateMember(memberId: string, input: UpdateMemberInput): Promise<void> {
  if (isSupabaseEnabled) {
    if (!supabase) throw new Error('Supabase is not configured.')
    const patch: Row = {}
    if (input.firstName !== undefined) patch.first_name = input.firstName
    if (input.lastName !== undefined) patch.last_name = input.lastName
    if (input.email !== undefined) patch.email = input.email
    if (input.role !== undefined) patch.role = input.role
    if (input.hubId !== undefined) patch.hub_id = input.hubId
    patch.updated_at = new Date().toISOString()
    const { error } = await supabase.from('profiles').update(patch).eq('id', memberId)
    if (error) throw new Error(errMessage(error, 'Could not save member.'))
    await afterMutation()
    return
  }

  const s0 = currentState()
  const member = s0.members.find((m) => m.id === memberId)
  if (!member) throw new Error('Member not found.')
  if (input.email && input.email !== member.email && s0.members.some((m) => m.email === input.email)) {
    throw new Error('A member with this email already exists.')
  }
  if (input.role && input.role !== 'Admin' && (input.hubId === undefined ? !member.hubId : !input.hubId)) {
    throw new Error('Staff members must be assigned to a hub.')
  }
  const updated: Member = {
    ...member,
    ...input,
    hubId: input.role !== undefined
      ? (input.role === 'Admin' ? null : (input.hubId ?? member.hubId))
      : (input.hubId !== undefined ? input.hubId : member.hubId),
    updatedAt: nowISO(),
  }
  const audit = auditEntry('Member', memberId, 'Member updated', `${updated.firstName} ${updated.lastName}`)
  commit({ ...s0, members: s0.members.map((m) => (m.id === memberId ? updated : m)), audit: [...s0.audit, audit] })
}

export async function setMemberStatus(memberId: string, status: 'Active' | 'Inactive'): Promise<void> {
  if (isSupabaseEnabled) {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.from('profiles').update({ status, updated_at: new Date().toISOString() }).eq('id', memberId)
    if (error) throw new Error(errMessage(error, 'Could not update member status.'))
    await afterMutation()
    return
  }
  const s0 = currentState()
  const member = s0.members.find((m) => m.id === memberId)
  if (!member) throw new Error('Member not found.')
  const updated = { ...member, status, updatedAt: nowISO() }
  const audit = auditEntry('Member', memberId, `Member ${status.toLowerCase()}`, `${member.firstName} ${member.lastName}`)
  commit({ ...s0, members: s0.members.map((m) => (m.id === memberId ? updated : m)), audit: [...s0.audit, audit] })
}

// ── Notifications ────────────────────────────────────────────────────────────

export async function markNotificationRead(notificationId: string): Promise<void> {
  if (isSupabaseEnabled) {
    if (!supabase) return
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notificationId)
    if (error) throw new Error(errMessage(error, 'Could not update notification.'))
    await afterMutation()
    return
  }
  const s0 = currentState()
  commit({ ...s0, notifications: s0.notifications.map((n) => (n.id === notificationId ? { ...n, read: true } : n)) })
}

export async function markAllNotificationsRead(): Promise<void> {
  const s0 = currentState()
  const memberId = s0.session?.memberId
  if (!memberId) return
  if (isSupabaseEnabled) {
    if (!supabase) return
    const { error } = await supabase.from('notifications').update({ read: true }).eq('target_member_id', memberId).eq('read', false)
    if (error) throw new Error(errMessage(error, 'Could not update notifications.'))
    await afterMutation()
    return
  }
  commit({ ...s0, notifications: s0.notifications.map((n) => (n.targetMemberId === memberId ? { ...n, read: true } : n)) })
}

export function unreadCount(s: AppState, memberId: string): number {
  return s.notifications.filter((n) => n.targetMemberId === memberId && !n.read).length
}

// ── Orders ───────────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  buyerName: string
  items: { productId: string; quantity: number; unitPrice: number }[]
  paymentMethod: 'Cash' | 'On credit'
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  if (isSupabaseEnabled) {
    const data = (await rpc('create_order', {
      p_buyer_name: input.buyerName,
      p_payment_method: input.paymentMethod,
      p_items: input.items.map((it) => ({
        product_id: it.productId,
        quantity: String(it.quantity),
        unit_price: String(it.unitPrice),
      })),
    })) as Row | null
    await afterMutation()
    const created = currentState().orders.find((o) => o.id === s(data?.id))
    if (created) return created
    return {
      id: s(data?.id), orderCode: s(data?.order_code), buyerName: input.buyerName, items: [],
      totalRevenue: n(data?.total_revenue), paymentMethod: input.paymentMethod, status: 'Confirmed',
      createdAt: nowISO(), recordedBy: currentMemberName(),
    }
  }

  const s0 = currentState()
  const orderItems: OrderItem[] = []
  const allAllocations: { allocation: AllocationResult; orderItemId: string }[] = []
  let totalRevenue = 0
  for (const item of input.items) {
    const product = s0.products.find((p) => p.id === item.productId)
    if (!product) throw new Error(`Product not found: ${item.productId}`)
    const allocations = allocateSaleToBatches(s0, item.productId, item.quantity)
    const lineTotal = round2(item.quantity * item.unitPrice)
    totalRevenue += lineTotal
    const orderItemId = nextId()
    orderItems.push({ id: orderItemId, productId: item.productId, quantity: item.quantity, unit: product.defaultUnit, unitPrice: item.unitPrice, lineTotal })
    for (const a of allocations) allAllocations.push({ allocation: a, orderItemId })
  }
  const order: Order = {
    id: nextId(),
    orderCode: codeFromIds(s0.orders, 'ORD'),
    buyerName: input.buyerName,
    items: orderItems,
    totalRevenue: round2(totalRevenue),
    paymentMethod: input.paymentMethod,
    status: 'Confirmed',
    createdAt: nowISO(),
    recordedBy: currentMemberName(),
  }
  const sales: Sale[] = []
  const farmerAllocations: FarmerAllocation[] = []
  let updatedBatches = [...s0.batches]
  for (const { allocation: a, orderItemId } of allAllocations) {
    const batch = updatedBatches.find((x) => x.id === a.batchId)
    if (!batch) throw new Error('Batch not found during allocation.')
    const nextSold = batch.quantitySold + a.allocatedQuantity
    updatedBatches = updatedBatches.map((x) =>
      x.id === a.batchId ? { ...x, quantitySold: nextSold, status: recomputeBatchStatus(x, nextSold, x.quantityReturned, x.quantityWasted) } : x,
    )
    sales.push({
      id: nextId(),
      saleCode: codeFromIds([...s0.sales, ...sales], 'SL', 5),
      batchId: a.batchId,
      productId: batch.productId,
      farmerId: a.farmerId,
      quantity: a.allocatedQuantity,
      unit: batch.unit,
      unitPrice: batch.marketPrice,
      buyerName: input.buyerName,
      paymentMethod: input.paymentMethod,
      paymentSettled: false,
      soldAt: nowISO(),
      recordedBy: currentMemberName(),
      orderId: order.id,
    })
    farmerAllocations.push({
      id: nextId(),
      orderItemId,
      batchId: a.batchId,
      farmerId: a.farmerId,
      productId: batch.productId,
      allocatedQuantity: a.allocatedQuantity,
      farmerPayout: a.farmerPayout,
      createdAt: nowISO(),
    })
  }
  const staffAMembers = s0.members.filter((m) => m.role === 'Staff A' && m.status === 'Active')
  const notifs: Notification[] = staffAMembers.map((m) => ({
    id: nextId(),
    type: 'order_confirmed' as const,
    title: 'New order created',
    message: `Order ${order.orderCode} by ${order.buyerName} (${fmtNum(totalRevenue)})`,
    targetMemberId: m.id,
    relatedEntityType: 'Order',
    relatedEntityId: order.id,
    read: false,
    createdAt: nowISO(),
  }))
  const audit = auditEntry('Order', order.id, 'Order created', `${order.orderCode} · ${fmtNum(totalRevenue)} from ${order.buyerName}`)
  commit({
    ...s0,
    orders: [...s0.orders, order],
    batches: updatedBatches,
    sales: [...s0.sales, ...sales],
    farmerAllocations: [...s0.farmerAllocations, ...farmerAllocations],
    notifications: [...s0.notifications, ...notifs],
    audit: [...s0.audit, audit],
  })
  return order
}

export interface CreateReturnRequestInput {
  orderId: string
  items: { productId: string; quantity: number }[]
  returnType: 'Normal' | 'Damaged'
  reason: string
  notes: string
}

export async function createReturnRequest(input: CreateReturnRequestInput): Promise<ReturnRequest> {
  if (isSupabaseEnabled) {
    const data = (await rpc('create_return_request', {
      p_order_id: input.orderId,
      p_items: input.items.map((it) => ({ product_id: it.productId, quantity: String(it.quantity) })),
      p_return_type: input.returnType,
      p_reason: input.reason,
      p_notes: input.notes,
    })) as Row | null
    await afterMutation()
    const created = currentState().returnRequests.find((r) => r.id === s(data?.id))
    if (created) return created
    return {
      id: s(data?.id), returnCode: s(data?.return_code), orderId: input.orderId, items: [],
      returnType: input.returnType, reason: input.reason, notes: input.notes, status: 'Pending Review',
      requestedBy: currentMemberName(), createdAt: nowISO(),
    }
  }

  const s0 = currentState()
  const order = s0.orders.find((o) => o.id === input.orderId)
  if (!order) throw new Error('Order not found.')
  const returnItems: ReturnRequestItem[] = input.items.map((item) => {
    const product = s0.products.find((p) => p.id === item.productId)
    return { id: nextId(), productId: item.productId, quantity: item.quantity, unit: product?.defaultUnit ?? 'kg' }
  })
  const rr: ReturnRequest = {
    id: nextId(),
    returnCode: codeFromIds(s0.returnRequests, 'RET'),
    orderId: input.orderId,
    items: returnItems,
    returnType: input.returnType,
    reason: input.reason,
    notes: input.notes,
    status: 'Pending Review',
    requestedBy: currentMemberName(),
    createdAt: nowISO(),
  }
  const staffAMembers = s0.members.filter((m) => m.role === 'Staff A' && m.status === 'Active')
  const notifs: Notification[] = staffAMembers.map((m) => ({
    id: nextId(),
    type: 'return_request' as const,
    title: 'Return request submitted',
    message: `${rr.returnCode} for order ${order.orderCode} — ${input.returnType} return`,
    targetMemberId: m.id,
    relatedEntityType: 'ReturnRequest',
    relatedEntityId: rr.id,
    read: false,
    createdAt: nowISO(),
  }))
  const audit = auditEntry('ReturnRequest', rr.id, 'Return requested', `${rr.returnCode} · ${input.returnType} · ${input.reason}`)
  commit({
    ...s0,
    returnRequests: [...s0.returnRequests, rr],
    notifications: [...s0.notifications, ...notifs],
    audit: [...s0.audit, audit],
  })
  return rr
}

export async function reviewReturnRequest(returnRequestId: string, decision: 'Approved' | 'Rejected', reviewNote?: string): Promise<void> {
  if (isSupabaseEnabled) {
    await rpc('review_return_request', {
      p_return_id: returnRequestId,
      p_decision: decision,
      p_review_note: reviewNote ?? null,
    })
    await afterMutation()
    return
  }

  const s0 = currentState()
  const rr = s0.returnRequests.find((r) => r.id === returnRequestId)
  if (!rr) throw new Error('Return request not found.')
  if (rr.status !== 'Pending Review') throw new Error('This return request has already been reviewed.')
  let updatedBatches = [...s0.batches]
  const returnRecords: ReturnRecord[] = []
  if (decision === 'Approved') {
    for (const item of rr.items) {
      const matchingSales = s0.sales.filter((sl) => sl.orderId === rr.orderId && sl.productId === item.productId)
      const batchIds = new Set(matchingSales.map((sl) => sl.batchId))
      const batchesForProduct = updatedBatches.filter((x) => batchIds.has(x.id))
      let remaining = item.quantity
      for (const batch of batchesForProduct) {
        if (remaining <= 0) break
        const addReturn = Math.min(remaining, batch.quantitySold - batch.quantityReturned)
        if (addReturn > 0) {
          updatedBatches = updatedBatches.map((x) => {
            if (x.id !== batch.id) return x
            const nextReturned = x.quantityReturned + addReturn
            return { ...x, quantityReturned: nextReturned, status: recomputeBatchStatus(x, x.quantitySold, nextReturned, x.quantityWasted) }
          })
          returnRecords.push({
            id: nextId(),
            returnCode: codeFromIds([...s0.returns, ...returnRecords], 'RTN'),
            batchId: batch.id,
            quantity: addReturn,
            unit: batch.unit,
            reason: rr.reason,
            condition: rr.returnType === 'Damaged' ? 'Damaged' : 'Good',
            returnedAt: nowISO(),
            recordedBy: currentMemberName(),
          })
          remaining -= addReturn
        }
      }
    }
  }
  const updatedRR: ReturnRequest = {
    ...rr,
    status: decision,
    reviewedBy: currentMemberName(),
    reviewNote,
    reviewedAt: nowISO(),
  }
  const staffB = s0.members.find((m) => m.role === 'Staff B' && m.status === 'Active')
  const notifs: Notification[] = staffB
    ? [{
        id: nextId(),
        type: decision === 'Approved' ? 'return_approved' : 'return_rejected',
        title: `Return ${decision.toLowerCase()}`,
        message: `${rr.returnCode} has been ${decision.toLowerCase()}${reviewNote ? ` — ${reviewNote}` : ''}`,
        targetMemberId: staffB.id,
        relatedEntityType: 'ReturnRequest',
        relatedEntityId: rr.id,
        read: false,
        createdAt: nowISO(),
      }]
    : []
  const audit = auditEntry('ReturnRequest', rr.id, `Return ${decision.toLowerCase()}`, `${rr.returnCode}${reviewNote ? ` · ${reviewNote}` : ''}`)
  commit({
    ...s0,
    returnRequests: s0.returnRequests.map((r) => (r.id === returnRequestId ? updatedRR : r)),
    batches: updatedBatches,
    returns: [...s0.returns, ...returnRecords],
    notifications: [...s0.notifications, ...notifs],
    audit: [...s0.audit, audit],
  })
}

// ── Hub stats ────────────────────────────────────────────────────────────────

export function selectHubStats(s: AppState, hubId: string) {
  const deliveries = s.deliveries.filter((d) => d.originHubId === hubId)
  const batches = s.batches.filter((x) => deliveries.some((d) => d.id === x.deliveryId))
  const sales = s.sales.filter((sl) => batches.some((x) => x.id === sl.batchId))
  return {
    deliveryCount: deliveries.length,
    draftCount: deliveries.filter((d) => d.status === 'Draft').length,
    onTheWayCount: deliveries.filter((d) => d.status === 'On the Way').length,
    receivedCount: deliveries.filter((d) => d.status === 'Received').length,
    completedCount: deliveries.filter((d) => d.status === 'Completed').length,
    totalReceived: batches.reduce((sum, x) => sum + x.originalQuantity, 0),
    totalSold: sales.reduce((sum, sl) => sum + sl.quantity * sl.unitPrice, 0),
  }
}

// ── Inventory helpers ────────────────────────────────────────────────────────

function deliveryGroupStatusOf(s: AppState, batch: Batch): string | null {
  const delivery = s.deliveries.find((d) => d.id === batch.deliveryId)
  if (!delivery?.groupId) return null
  return s.deliveryGroups.find((g) => g.id === delivery.groupId)?.status ?? null
}

export function isSellableBatch(s: AppState, batch: Batch): boolean {
  const closed = ['Sold', 'Returned', 'Closed']
  if (closed.includes(batch.status)) return false
  if (batchRemaining(batch) <= 0) return false
  if (deliveryGroupStatusOf(s, batch) !== 'Received') return false
  return true
}

export interface AggregatedProduct {
  productId: string
  name: string
  emoji: string
  unit: string
  totalDelivered: number
  totalSold: number
  totalReturned: number
  totalRemaining: number
  totalRevenue: number
  averageMarketPrice: number
  batches: Batch[]
}

export function selectAggregatedInventory(s: AppState): AggregatedProduct[] {
  const map = new Map<string, { batches: Batch[]; product: Product }>()
  for (const batch of s.batches) {
    if (batch.status === 'Closed' || batch.status === 'Returned' || batch.status === 'Sold') continue
    if (deliveryGroupStatusOf(s, batch) !== 'Received') continue
    const product = s.products.find((p) => p.id === batch.productId)
    if (!product) continue
    const existing = map.get(batch.productId)
    if (existing) existing.batches.push(batch)
    else map.set(batch.productId, { batches: [batch], product })
  }
  return Array.from(map.values()).map(({ batches: bs, product }) => {
    let totalDelivered = 0, totalSold = 0, totalReturned = 0, totalRevenue = 0, totalMarketValue = 0
    for (const x of bs) {
      totalDelivered += x.originalQuantity
      totalSold += x.quantitySold
      totalReturned += x.quantityReturned
      totalRevenue += x.quantitySold * x.marketPrice
      totalMarketValue += x.originalQuantity * x.marketPrice
    }
    return {
      productId: product.id,
      name: product.name,
      emoji: product.emoji,
      unit: product.defaultUnit,
      totalDelivered: round2(totalDelivered),
      totalSold: round2(totalSold),
      totalReturned: round2(totalReturned),
      totalRemaining: round2(totalDelivered - totalSold - totalReturned),
      totalRevenue: round2(totalRevenue),
      averageMarketPrice: totalDelivered > 0 ? round2(totalMarketValue / totalDelivered) : 0,
      batches: bs,
    }
  })
}

// ── Farmer attention / demand / trend ────────────────────────────────────────

export interface FarmerStats {
  deliveries: number
  supplied: number
  sold: number
  returned: number
  sellThroughPct: number
  potential: number
  actualValue: number
  pendingPayable: number
}

export function selectFarmerStats(s: AppState, farmerId: string): FarmerStats {
  const batches = s.batches.filter((x) => x.farmerId === farmerId)
  const sales = s.sales.filter((sl) => sl.farmerId === farmerId)
  let supplied = 0
  let sold = 0
  let returned = 0
  let potential = 0
  for (const x of batches) {
    supplied += x.originalQuantity
    sold += x.quantitySold
    returned += x.quantityReturned
    potential += potentialValue(x)
  }
  const actualValue = sales.reduce((sum, sl) => sum + saleSubtotal(sl), 0)
  return {
    deliveries: s.deliveries.filter((d) => d.farmerId === farmerId).length,
    supplied: round2(supplied),
    sold: round2(sold),
    returned: round2(returned),
    sellThroughPct: sellThrough(supplied, sold),
    potential: round2(potential),
    actualValue: round2(actualValue),
    pendingPayable: farmerPendingPayable(s, farmerId),
  }
}

export interface FarmerAttentionRow {
  farmerId: string
  farmerName: string
  supplied: number
  sold: number
  returned: number
  sellThroughPct: number
  actualValue: number
  pendingPayable: number
  lastDeliveryAt: string
  daysSinceLastDelivery: number
  reasons: string[]
  reasonCodes: string[]
  needsAttention: boolean
}

export function selectFarmerAttention(s: AppState): FarmerAttentionRow[] {
  const today = startOfToday()
  const rows: FarmerAttentionRow[] = []
  for (const f of s.farmers) {
    const stats = selectFarmerStats(s, f.id)
    const farmerBatches = s.batches.filter((x) => x.farmerId === f.id)
    const farmerReturns = farmerBatches.reduce((sum, x) => sum + x.quantityReturned, 0)
    const deliveries = s.deliveries.filter((d) => d.farmerId === f.id)
    const lastDel = deliveries.sort((a, b) => (a.deliveryDate < b.deliveryDate ? 1 : -1))[0]
    const dayMs = 86400000
    const lastTs = lastDel ? new Date(lastDel.deliveryDate).getTime() : 0
    const daysSince = lastDel ? Math.max(0, Math.floor((new Date(today).getTime() - lastTs) / dayMs)) : -1
    const sellThroughPct = stats.supplied > 0 ? (stats.sold / stats.supplied) * 100 : 0

    const reasons: string[] = []
    const reasonCodes: string[] = []

    if (stats.actualValue > 0 && stats.pendingPayable > 0 && stats.pendingPayable > stats.actualValue * 0.6) {
      reasons.push('A large share of the revenue from supplied produce is still owed to the farmer.')
      reasonCodes.push('high-pending-payable')
    }
    if (stats.supplied > 0 && sellThroughPct < 40) {
      reasons.push('Most of the supplied produce has not yet sold.')
      reasonCodes.push('low-sellthrough')
    }
    if (farmerReturns > 0 && stats.supplied > 0) {
      const returnRate = (farmerReturns / stats.supplied) * 100
      if (returnRate > 25) {
        reasons.push(`${fmtNum(returnRate)}% of supplied quantity was returned unsold.`)
        reasonCodes.push('high-returns')
      }
    }
    if (stats.supplied > 0 && daysSince !== -1 && daysSince > 21) {
      reasons.push(`No delivery recorded in the last ${daysSince} days.`)
      reasonCodes.push('slow-supply')
    }
    if (f.status !== 'Active') {
      reasons.push('Farmer profile is marked inactive.')
      reasonCodes.push('inactive-profile')
    }
    if (farmerBatches.some((x) => x.status === 'Available' && x.quantitySold === 0 && x.quantityReturned === 0)) {
      reasons.push('Has supplied consignment with no recorded sales.')
      reasonCodes.push('unsold-consignment')
    }

    rows.push({
      farmerId: f.id,
      farmerName: `${f.firstName} ${f.lastName}`,
      supplied: stats.supplied,
      sold: stats.sold,
      returned: farmerReturns,
      sellThroughPct,
      actualValue: stats.actualValue,
      pendingPayable: stats.pendingPayable,
      lastDeliveryAt: lastDel?.deliveryDate ?? '',
      daysSinceLastDelivery: daysSince,
      reasons,
      reasonCodes,
      needsAttention: reasons.length > 0,
    })
  }
  return rows.sort((a, b) => (a.needsAttention === b.needsAttention ? 0 : a.needsAttention ? -1 : 1))
}

export interface DemandRow {
  productId: string
  name: string
  emoji: string
  requested: number
  available: number
  gap: number
  tone: 'urgent' | 'steady' | 'surplus'
}

export function selectDemand(s: AppState): DemandRow[] {
  const requested: Record<string, number> = {}
  for (const po of s.preorders) {
    if (po.status === 'Cancelled') continue
    for (const it of po.items) requested[it.productId] = (requested[it.productId] ?? 0) + it.requested
  }
  return s.products.map((product) => {
    let available = 0
    for (const x of s.batches) {
      if (x.productId !== product.id) continue
      if (x.status === 'Closed' || x.status === 'Returned' || x.status === 'Sold') continue
      if (deliveryGroupStatusOf(s, x) !== 'Received') continue
      available += batchRemaining(x)
    }
    const req = requested[product.id] ?? 0
    const gap = round2(available - req)
    const tone: DemandRow['tone'] = gap < -2 ? 'urgent' : gap <= 2 ? 'steady' : 'surplus'
    return { productId: product.id, name: product.name, emoji: product.emoji, requested: req, available: round2(available), gap, tone }
  })
}

export interface ChartPoint {
  label: string
  actual: number
  potential: number
}

function bucketWindows(period: string, count: number, perMs: number): { from: number; to: number; label: string }[] {
  const end = new Date(startOfToday()).getTime()
  const windows: { from: number; to: number; label: string }[] = []
  for (let i = count - 1; i >= 0; i -= 1) {
    const to = end - (count - 1 - i) * perMs
    const from = to - perMs
    const label =
      period === 'Year'
        ? `Q${i + 1}`
        : period === 'Quarter'
          ? new Date(from).toLocaleDateString('en-PH', { month: 'short' })
          : new Date(from).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    windows.push({ from, to, label })
  }
  return windows
}

export function selectSalesTrend(s: AppState, period: string): ChartPoint[] {
  const msDay = 86400000
  const config: Record<string, { count: number; perMs: number }> = {
    Week: { count: 7, perMs: msDay },
    Month: { count: 4, perMs: 7 * msDay },
    Quarter: { count: 3, perMs: 30 * msDay },
    Year: { count: 4, perMs: 90 * msDay },
  }
  const cfg = config[period] ?? config.Week
  const windows = bucketWindows(period, cfg.count, cfg.perMs)
  return windows.map((w) => {
    let actual = 0
    let potential = 0
    for (const sale of s.sales) {
      const t = new Date(sale.soldAt).getTime()
      if (t >= w.from && t < w.to) actual += saleSubtotal(sale)
    }
    for (const batch of s.batches) {
      const t = new Date(batch.receivedAt).getTime()
      if (t >= w.from && t < w.to) potential += potentialValue(batch)
    }
    return { label: w.label, actual: round2(actual), potential: round2(potential) }
  })
}

export interface Totals {
  potential: number
  actual: number
  labFees: number
  payablesPending: number
  sellThroughPct: number
  returnsQty: number
  wasteQty: number
  saleCount: number
}

export function selectTotals(s: AppState): Totals {
  let potential = 0
  let sold = 0
  let original = 0
  let labFees = 0
  let returnsQty = 0
  let wasteQty = 0
  for (const x of s.batches) {
    potential += potentialValue(x)
    sold += x.quantitySold
    original += x.originalQuantity
    labFees += labFeeFor(x.quantitySold, x.labFee)
    returnsQty += x.quantityReturned
    wasteQty += x.quantityWasted
  }
  const actual = s.sales.reduce((sum, sale) => sum + saleSubtotal(sale), 0)
  let payablesPending = 0
  for (const f of s.farmers) payablesPending += farmerPendingPayable(s, f.id)
  return {
    potential: round2(potential),
    actual: round2(actual),
    labFees: round2(labFees),
    payablesPending: round2(payablesPending),
    sellThroughPct: sellThrough(original, sold),
    returnsQty,
    wasteQty,
    saleCount: s.sales.length,
  }
}

export interface AllocationResult {
  batchId: string
  farmerId: string
  allocatedQuantity: number
  farmerPayout: number
}

export function allocateSaleToBatches(s: AppState, productId: string, quantitySold: number): AllocationResult[] {
  const eligible = s.batches.filter((x) => x.productId === productId && batchRemaining(x) > 0 && deliveryGroupStatusOf(s, x) === 'Received')
  const totalAvailable = eligible.reduce((sum, x) => sum + batchRemaining(x), 0)
  if (quantitySold > totalAvailable) {
    throw new Error(`Insufficient inventory. Available: ${fmtNum(totalAvailable)}, requested: ${fmtNum(quantitySold)}.`)
  }
  if (quantitySold <= 0) throw new Error('Sale quantity must be greater than zero.')
  const nEl = eligible.length
  const equalShare = quantitySold / nEl
  const results: { batch: Batch; allocated: number }[] = []
  let remaining = quantitySold
  for (const batch of eligible) {
    const cap = batchRemaining(batch)
    const allocated = Math.min(equalShare, cap)
    results.push({ batch, allocated: round2(allocated) })
    remaining -= allocated
  }
  remaining = round2(remaining)
  if (remaining > 0) {
    for (const r of results) {
      if (remaining <= 0) break
      const room = batchRemaining(r.batch) - r.allocated
      const add = Math.min(remaining, room)
      r.allocated = round2(r.allocated + add)
      remaining -= add
    }
  }
  return results.map((r) => ({
    batchId: r.batch.id,
    farmerId: r.batch.farmerId,
    allocatedQuantity: r.allocated,
    farmerPayout: round2(r.allocated * r.batch.farmerPrice),
  }))
}
