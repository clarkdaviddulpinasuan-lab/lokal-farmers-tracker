export type FarmerStatus = 'Active' | 'Inactive'

export interface Farmer {
  id: string
  farmerCode: string
  firstName: string
  lastName: string
  age: number
  gender: string
  address: string
  barangay: string
  municipality: string
  phone: string
  status: FarmerStatus
  createdAt: string
  notes?: string
}

export interface Product {
  id: string
  name: string
  category: string
  defaultUnit: string
  emoji: string
}

export type DeliveryStatus =
  | 'Draft'
  | 'On the Way'
  | 'Received'
  | 'Sales Recorded'
  | 'Completed'
  | 'Cancelled'

export interface Delivery {
  id: string
  deliveryCode: string
  farmerId: string
  deliveryDate: string
  collectionLocation: string
  receivedBy: string
  status: DeliveryStatus
  originHubId: string
  openedBy: string
  groupId: string | null
}

export interface DeliveryGroup {
  id: string
  groupCode: string
  originHubId: string
  status: 'Pending' | 'On the Way' | 'Received'
  createdBy: string
  sentBy?: string
  sentAt?: string
  receivedBy?: string
  receivedAt?: string
  createdAt: string
}

export type NotificationType =
  | 'delivery_incoming'
  | 'delivery_received'
  | 'return_request'
  | 'return_approved'
  | 'return_rejected'
  | 'order_confirmed'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  targetMemberId: string
  relatedEntityType: string
  relatedEntityId: string
  read: boolean
  createdAt: string
}

export type OrderStatus = 'Confirmed' | 'Cancelled'

export interface Order {
  id: string
  orderCode: string
  buyerName: string
  items: OrderItem[]
  totalRevenue: number
  paymentMethod: PaymentStatus
  status: OrderStatus
  createdAt: string
  recordedBy: string
}

export interface OrderItem {
  id: string
  productId: string
  quantity: number
  unit: string
  unitPrice: number
  lineTotal: number
}

export type ReturnRequestStatus =
  | 'Pending Review'
  | 'Approved'
  | 'Rejected'
  | 'Processed'

export type ReturnType = 'Normal' | 'Damaged'

export interface ReturnRequest {
  id: string
  returnCode: string
  orderId: string
  items: ReturnRequestItem[]
  returnType: ReturnType
  reason: string
  notes: string
  status: ReturnRequestStatus
  requestedBy: string
  reviewedBy?: string
  reviewNote?: string
  reviewedAt?: string
  createdAt: string
}

export interface ReturnRequestItem {
  id: string
  productId: string
  quantity: number
  unit: string
}

export interface FarmerAllocation {
  id: string
  orderItemId: string
  batchId: string
  farmerId: string
  productId: string
  allocatedQuantity: number
  farmerPayout: number
  createdAt: string
}

export type ConsignmentStatus =
  | 'Pending'
  | 'At Hub'
  | 'Available'
  | 'Reserved'
  | 'Partially Sold'
  | 'Sold'
  | 'Returned'
  | 'Partially Returned'
  | 'Closed'

export interface Batch {
  id: string
  batchCode: string
  deliveryId: string
  productId: string
  farmerId: string
  originalQuantity: number
  quantitySold: number
  quantityReturned: number
  quantityWasted: number
  unit: string
  qualityGrade: string
  farmerPrice: number
  labFee: number
  marketPrice: number
  status: ConsignmentStatus
  receivedAt: string
}

export type PaymentStatus = 'Cash' | 'On credit'

export interface Sale {
  id: string
  saleCode: string
  batchId: string
  productId: string
  farmerId: string
  quantity: number
  unit: string
  unitPrice: number
  buyerName: string
  paymentMethod: PaymentStatus
  paymentSettled: boolean
  soldAt: string
  recordedBy: string
  orderId?: string
}

export interface ReturnRecord {
  id: string
  returnCode: string
  batchId: string
  quantity: number
  unit: string
  reason: string
  condition: string
  returnedAt: string
  recordedBy: string
}

export type SettlementStatus = 'Pending' | 'Approved' | 'Paid' | 'Cancelled'

export interface SettlementItem {
  saleId: string
  batchCode: string
  productName: string
  quantity: number
  farmerPrice: number
  farmerAmount: number
}

export interface Settlement {
  id: string
  settlementCode: string
  farmerId: string
  periodStart: string
  periodEnd: string
  items: SettlementItem[]
  totalSales: number
  adjustments: number
  payable: number
  status: SettlementStatus
  paidAt?: string
  paymentMethod?: string
  createdAt: string
}

export interface Preorder {
  id: string
  buyerName: string
  requestedDate: string
  status: 'Requested' | 'Confirmed' | 'Partially Fulfilled' | 'Fulfilled' | 'Cancelled'
  items: { productId: string; requested: number }[]
}

export interface AuditEntry {
  id: string
  timestamp: string
  action: string
  entityType: string
  entityId: string
  detail: string
  by: string
}

export type Role = 'Admin' | 'Staff A' | 'Staff B'
export type MemberStatus = 'Active' | 'Inactive'
export type HubStatus = 'Active' | 'Inactive'

export interface Hub {
  id: string
  hubCode: string
  name: string
  municipality: string
  status: HubStatus
  createdAt: string
}

export interface Member {
  id: string
  memberCode: string
  firstName: string
  lastName: string
  email: string
  password: string
  role: Role
  hubId: string | null
  status: MemberStatus
  createdAt: string
  updatedAt: string
}

export interface Session {
  memberId: string
  signedInAt: string
}

export type BackendMode = 'supabase' | 'local'

export interface AppState {
  farmers: Farmer[]
  products: Product[]
  deliveries: Delivery[]
  batches: Batch[]
  sales: Sale[]
  returns: ReturnRecord[]
  settlements: Settlement[]
  preorders: Preorder[]
  audit: AuditEntry[]
  hubs: Hub[]
  members: Member[]
  session: Session | null
  deliveryGroups: DeliveryGroup[]
  notifications: Notification[]
  orders: Order[]
  returnRequests: ReturnRequest[]
  farmerAllocations: FarmerAllocation[]
  authReady: boolean
  dataReady: boolean
  backend: BackendMode
  loadError: string | null
}
