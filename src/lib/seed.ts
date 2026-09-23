import type { AppState, Batch, Delivery, Farmer, FarmerAllocation, Hub, Member, Notification, Order, Preorder, ReturnRequest, Sale, Settlement } from '../types'
import { daysAgo, startOfToday } from './calc'

const p = {
  tomatoes: { id: 'p-tom', name: 'Tomatoes', category: 'Vegetables', defaultUnit: 'kg', emoji: '🍅' },
  eggplant: { id: 'p-egg', name: 'Eggplant', category: 'Vegetables', defaultUnit: 'kg', emoji: '🍆' },
  banana: { id: 'p-ban', name: 'Banana', category: 'Fruits', defaultUnit: 'kg', emoji: '🍌' },
  coconut: { id: 'p-coc', name: 'Coconut', category: 'Fruits', defaultUnit: 'pc', emoji: '🥥' },
  squash: { id: 'p-squ', name: 'Squash', category: 'Vegetables', defaultUnit: 'kg', emoji: '🎃' },
  cassava: { id: 'p-cas', name: 'Cassava', category: 'Root crops', defaultUnit: 'kg', emoji: '🥔' },
  sweetpotato: { id: 'p-swt', name: 'Sweet Potato', category: 'Root crops', defaultUnit: 'kg', emoji: '🍠' },
}

const farmers: Farmer[] = [
  { id: 'f-juan', farmerCode: 'F-00127', firstName: 'Juan', lastName: 'Dela Cruz', age: 47, gender: 'Male', address: 'Purok 3', barangay: 'San Isidro', municipality: 'General Luna', phone: '0917 555 0127', status: 'Active', createdAt: daysAgo(240, 8), notes: 'Pioneer tomato grower in the area.' },
  { id: 'f-maria', farmerCode: 'F-00118', firstName: 'Maria', lastName: 'Santos', age: 39, gender: 'Female', address: 'Purok 1', barangay: 'San Roque', municipality: 'General Luna', phone: '0918 555 0118', status: 'Active', createdAt: daysAgo(210, 8) },
  { id: 'f-pedro', farmerCode: 'F-00094', firstName: 'Pedro', lastName: 'Flores', age: 52, gender: 'Male', address: 'Sitio Magsaysay', barangay: 'Baclaran', municipality: 'General Luna', phone: '0920 555 0094', status: 'Active', createdAt: daysAgo(190, 8) },
  { id: 'f-ana', farmerCode: 'F-00076', firstName: 'Ana', lastName: 'Ramirez', age: 35, gender: 'Female', address: 'Purok 5', barangay: 'San Antonio', municipality: 'General Luna', phone: '0916 555 0076', status: 'Active', createdAt: daysAgo(160, 8) },
  { id: 'f-ramon', farmerCode: 'F-00063', firstName: 'Ramon', lastName: 'Villanueva', age: 58, gender: 'Male', address: 'Sitio Igang', barangay: 'Baclaran', municipality: 'General Luna', phone: '0919 555 0063', status: 'Active', createdAt: daysAgo(140, 8) },
  { id: 'f-liza', farmerCode: 'F-00058', firstName: 'Liza', lastName: 'Navarro', age: 31, gender: 'Female', address: 'Purok 2', barangay: 'San Roque', municipality: 'General Luna', phone: '0921 555 0058', status: 'Active', createdAt: daysAgo(120, 8) },
  { id: 'f-carlos', farmerCode: 'F-00041', firstName: 'Carlos', lastName: 'Mendoza', age: 44, gender: 'Male', address: 'Purok 6', barangay: 'San Isidro', municipality: 'General Luna', phone: '0915 555 0041', status: 'Active', createdAt: daysAgo(95, 8) },
  { id: 'f-fe', farmerCode: 'F-00032', firstName: 'Fe', lastName: 'Bagayan', age: 49, gender: 'Female', address: 'Sitio Dinalupa', barangay: 'San Antonio', municipality: 'General Luna', phone: '0917 555 0032', status: 'Active', createdAt: daysAgo(70, 8) },
]

const hubs: Hub[] = [
  { id: 'hub-a', hubCode: 'HB-001', name: 'Hub A', municipality: 'General Luna', status: 'Active', createdAt: daysAgo(300, 8) },
  { id: 'hub-b', hubCode: 'HB-002', name: 'Hub B', municipality: 'Santa Cruz', status: 'Active', createdAt: daysAgo(300, 8) },
]

const members: Member[] = [
  { id: 'm-admin', memberCode: 'MB-001', firstName: 'Admin', lastName: 'User', email: 'admin@example.com', password: 'lokal123', role: 'Admin', hubId: null, status: 'Active', createdAt: daysAgo(300, 8), updatedAt: daysAgo(300, 8) },
  { id: 'm-staffa', memberCode: 'MB-002', firstName: 'Clark', lastName: 'Suan', email: 'staffa@example.com', password: 'lokal123', role: 'Staff A', hubId: 'hub-a', status: 'Active', createdAt: daysAgo(290, 8), updatedAt: daysAgo(290, 8) },
  { id: 'm-staffb', memberCode: 'MB-003', firstName: 'Maria', lastName: 'Lopez', email: 'staffb@example.com', password: 'lokal123', role: 'Staff B', hubId: 'hub-b', status: 'Active', createdAt: daysAgo(290, 8), updatedAt: daysAgo(290, 8) },
]

const deliveries: Delivery[] = [
  { id: 'd-01', deliveryCode: 'DLV-00130', farmerId: 'f-juan', deliveryDate: daysAgo(5, 8, 45), collectionLocation: 'San Isidro pickup point', receivedBy: 'Maria Lopez', status: 'Received', originHubId: 'hub-a', openedBy: 'm-staffa', groupId: 'dg-01' },
  { id: 'd-02', deliveryCode: 'DLV-00131', farmerId: 'f-maria', deliveryDate: daysAgo(4, 8, 42), collectionLocation: 'San Roque pickup point', receivedBy: 'Maria Lopez', status: 'Received', originHubId: 'hub-a', openedBy: 'm-staffa', groupId: 'dg-01' },
  { id: 'd-03', deliveryCode: 'DLV-00132', farmerId: 'f-pedro', deliveryDate: daysAgo(3, 15, 2), collectionLocation: 'Baclaran pickup point', receivedBy: 'Joey Reyes', status: 'Completed', originHubId: 'hub-a', openedBy: 'm-staffa', groupId: 'dg-02' },
  { id: 'd-04', deliveryCode: 'DLV-00133', farmerId: 'f-ana', deliveryDate: daysAgo(3, 14, 37), collectionLocation: 'San Antonio point', receivedBy: 'Joey Reyes', status: 'Completed', originHubId: 'hub-a', openedBy: 'm-staffa', groupId: 'dg-02' },
  { id: 'd-05', deliveryCode: 'DLV-00134', farmerId: 'f-ramon', deliveryDate: daysAgo(4, 7, 30), collectionLocation: 'Baclaran pickup point', receivedBy: 'Maria Lopez', status: 'Received', originHubId: 'hub-a', openedBy: 'm-staffa', groupId: 'dg-03' },
  { id: 'd-06', deliveryCode: 'DLV-00135', farmerId: 'f-liza', deliveryDate: daysAgo(2, 10, 15), collectionLocation: 'San Roque pickup point', receivedBy: 'Maria Lopez', status: 'Received', originHubId: 'hub-a', openedBy: 'm-staffa', groupId: 'dg-03' },
  { id: 'd-07', deliveryCode: 'DLV-00136', farmerId: 'f-carlos', deliveryDate: daysAgo(3, 16, 40), collectionLocation: 'San Isidro pickup point', receivedBy: 'Joey Reyes', status: 'Completed', originHubId: 'hub-a', openedBy: 'm-staffa', groupId: null },
  { id: 'd-08', deliveryCode: 'DLV-00137', farmerId: 'f-fe', deliveryDate: daysAgo(2, 9, 58), collectionLocation: 'San Antonio point', receivedBy: 'Maria Lopez', status: 'Received', originHubId: 'hub-a', openedBy: 'm-staffa', groupId: null },
  { id: 'd-09', deliveryCode: 'DLV-00138', farmerId: 'f-maria', deliveryDate: daysAgo(1, 10, 4), collectionLocation: 'San Roque pickup point', receivedBy: 'Maria Lopez', status: 'Received', originHubId: 'hub-a', openedBy: 'm-staffa', groupId: null },
  { id: 'd-10', deliveryCode: 'DLV-00139', farmerId: 'f-liza', deliveryDate: daysAgo(1, 14, 22), collectionLocation: 'San Roque pickup point', receivedBy: 'Joey Reyes', status: 'Draft', originHubId: 'hub-a', openedBy: 'm-staffa', groupId: null },
  { id: 'd-11', deliveryCode: 'DLV-00140', farmerId: 'f-ramon', deliveryDate: daysAgo(0, 8, 17), collectionLocation: 'Baclaran pickup point', receivedBy: 'Maria Lopez', status: 'Draft', originHubId: 'hub-a', openedBy: 'm-staffa', groupId: null },
]

const batches: Batch[] = [
  { id: 'b-0481', batchCode: 'KL-20260916-00481', deliveryId: 'd-01', productId: p.tomatoes.id, farmerId: 'f-juan', originalQuantity: 24.5, quantitySold: 22.5, quantityReturned: 0, quantityWasted: 0, unit: 'kg', qualityGrade: 'Grade A', farmerPrice: 80, labFee: 20, marketPrice: 100, status: 'Partially Sold', receivedAt: daysAgo(5, 9, 14) },
  { id: 'b-0482', batchCode: 'KL-20260917-00482', deliveryId: 'd-02', productId: p.banana.id, farmerId: 'f-maria', originalQuantity: 38, quantitySold: 11, quantityReturned: 0, quantityWasted: 0, unit: 'kg', qualityGrade: 'Grade A', farmerPrice: 70, labFee: 10, marketPrice: 95, status: 'Partially Sold', receivedAt: daysAgo(4, 8, 42) },
  { id: 'b-0483', batchCode: 'KL-20260918-00483', deliveryId: 'd-03', productId: p.eggplant.id, farmerId: 'f-pedro', originalQuantity: 20, quantitySold: 0, quantityReturned: 0, quantityWasted: 0, unit: 'kg', qualityGrade: 'Grade B', farmerPrice: 90, labFee: 10, marketPrice: 100, status: 'Available', receivedAt: daysAgo(3, 15, 2) },
  { id: 'b-0484', batchCode: 'KL-20260918-00484', deliveryId: 'd-04', productId: p.coconut.id, farmerId: 'f-ana', originalQuantity: 31, quantitySold: 0, quantityReturned: 0, quantityWasted: 0, unit: 'pc', qualityGrade: 'Grade A', farmerPrice: 45, labFee: 5, marketPrice: 60, status: 'Available', receivedAt: daysAgo(3, 15, 2) },
  { id: 'b-0485', batchCode: 'KL-20260917-00485', deliveryId: 'd-05', productId: p.squash.id, farmerId: 'f-ramon', originalQuantity: 40, quantitySold: 12, quantityReturned: 0, quantityWasted: 0, unit: 'kg', qualityGrade: 'Grade A', farmerPrice: 40, labFee: 8, marketPrice: 60, status: 'Partially Sold', receivedAt: daysAgo(4, 7, 30) },
  { id: 'b-0486', batchCode: 'KL-20260919-00486', deliveryId: 'd-06', productId: p.cassava.id, farmerId: 'f-liza', originalQuantity: 25, quantitySold: 0, quantityReturned: 0, quantityWasted: 0, unit: 'kg', qualityGrade: 'Grade B', farmerPrice: 35, labFee: 5, marketPrice: 50, status: 'Available', receivedAt: daysAgo(2, 10, 15) },
  { id: 'b-0487', batchCode: 'KL-20260918-00487', deliveryId: 'd-07', productId: p.sweetpotato.id, farmerId: 'f-carlos', originalQuantity: 18, quantitySold: 6, quantityReturned: 0, quantityWasted: 0, unit: 'kg', qualityGrade: 'Grade A', farmerPrice: 60, labFee: 10, marketPrice: 85, status: 'Partially Sold', receivedAt: daysAgo(3, 16, 40) },
  { id: 'b-0488', batchCode: 'KL-20260919-00488', deliveryId: 'd-08', productId: p.eggplant.id, farmerId: 'f-fe', originalQuantity: 30, quantitySold: 9, quantityReturned: 0, quantityWasted: 0, unit: 'kg', qualityGrade: 'Grade A', farmerPrice: 85, labFee: 15, marketPrice: 130, status: 'Partially Sold', receivedAt: daysAgo(2, 9, 58) },
  { id: 'b-0489', batchCode: 'KL-20260920-00489', deliveryId: 'd-09', productId: p.tomatoes.id, farmerId: 'f-maria', originalQuantity: 14, quantitySold: 0, quantityReturned: 0, quantityWasted: 0, unit: 'kg', qualityGrade: 'Grade A', farmerPrice: 80, labFee: 16, marketPrice: 100, status: 'Available', receivedAt: daysAgo(1, 10, 4) },
  { id: 'b-0490', batchCode: 'KL-20260920-00490', deliveryId: 'd-10', productId: p.tomatoes.id, farmerId: 'f-liza', originalQuantity: 12, quantitySold: 0, quantityReturned: 0, quantityWasted: 0, unit: 'kg', qualityGrade: 'Grade B', farmerPrice: 74, labFee: 14, marketPrice: 96, status: 'Pending', receivedAt: daysAgo(1, 14, 22) },
  { id: 'b-0491', batchCode: 'KL-20260921-00491', deliveryId: 'd-11', productId: p.banana.id, farmerId: 'f-ramon', originalQuantity: 22, quantitySold: 0, quantityReturned: 0, quantityWasted: 0, unit: 'kg', qualityGrade: 'Grade A', farmerPrice: 68, labFee: 12, marketPrice: 92, status: 'At Hub', receivedAt: daysAgo(0, 8, 17) },
  { id: 'b-0492', batchCode: 'KL-20260921-00492', deliveryId: 'd-11', productId: p.coconut.id, farmerId: 'f-ana', originalQuantity: 24, quantitySold: 0, quantityReturned: 0, quantityWasted: 0, unit: 'pc', qualityGrade: 'Grade A', farmerPrice: 45, labFee: 5, marketPrice: 60, status: 'At Hub', receivedAt: daysAgo(0, 9, 5) },
]

const sales: Sale[] = [
  { id: 's-260', saleCode: 'SL-00260', batchId: 'b-0482', productId: p.banana.id, farmerId: 'f-maria', quantity: 6, unit: 'kg', unitPrice: 95, buyerName: 'Harana Kitchen', paymentMethod: 'Cash', paymentSettled: true, soldAt: daysAgo(4, 10, 30), recordedBy: 'Maria Lopez' },
  { id: 's-264', saleCode: 'SL-00264', batchId: 'b-0485', productId: p.squash.id, farmerId: 'f-ramon', quantity: 12, unit: 'kg', unitPrice: 60, buyerName: 'Mom\u2019s Kitchen', paymentMethod: 'Cash', paymentSettled: false, soldAt: daysAgo(3, 13, 20), recordedBy: 'Joey Reyes' },
  { id: 's-270', saleCode: 'SL-00270', batchId: 'b-0482', productId: p.banana.id, farmerId: 'f-maria', quantity: 5, unit: 'kg', unitPrice: 95, buyerName: 'Walk-in customer', paymentMethod: 'Cash', paymentSettled: false, soldAt: daysAgo(2, 16, 10), recordedBy: 'Maria Lopez' },
  { id: 's-271', saleCode: 'SL-00271', batchId: 'b-0481', productId: p.tomatoes.id, farmerId: 'f-juan', quantity: 5, unit: 'kg', unitPrice: 100, buyerName: 'Bravo Restaurant', paymentMethod: 'Cash', paymentSettled: false, soldAt: daysAgo(3, 11, 0), recordedBy: 'Maria Lopez' },
  { id: 's-275', saleCode: 'SL-00275', batchId: 'b-0487', productId: p.sweetpotato.id, farmerId: 'f-carlos', quantity: 6, unit: 'kg', unitPrice: 85, buyerName: 'Bravo Restaurant', paymentMethod: 'Cash', paymentSettled: false, soldAt: daysAgo(2, 12, 45), recordedBy: 'Joey Reyes' },
  { id: 's-276', saleCode: 'SL-00276', batchId: 'b-0488', productId: p.eggplant.id, farmerId: 'f-fe', quantity: 9, unit: 'kg', unitPrice: 130, buyerName: 'Harana Kitchen', paymentMethod: 'Cash', paymentSettled: false, soldAt: daysAgo(1, 15, 8), recordedBy: 'Maria Lopez' },
  { id: 's-280', saleCode: 'SL-00280', batchId: 'b-0481', productId: p.tomatoes.id, farmerId: 'f-juan', quantity: 10, unit: 'kg', unitPrice: 100, buyerName: 'Harana Kitchen', paymentMethod: 'On credit', paymentSettled: false, soldAt: daysAgo(2, 14, 20), recordedBy: 'Maria Lopez' },
  { id: 's-281', saleCode: 'SL-00281', batchId: 'b-0481', productId: p.tomatoes.id, farmerId: 'f-juan', quantity: 7.5, unit: 'kg', unitPrice: 100, buyerName: 'Walk-in customer', paymentMethod: 'Cash', paymentSettled: false, soldAt: daysAgo(1, 10, 5), recordedBy: 'Maria Lopez' },
]

const settlements: Settlement[] = [
  {
    id: 'st-182', settlementCode: 'ST-00182', farmerId: 'f-maria',
    periodStart: daysAgo(7, 8), periodEnd: daysAgo(0, 8),
    items: [{ saleId: 's-260', batchCode: 'KL-20260917-00482', productName: 'Banana', quantity: 6, farmerPrice: 70, farmerAmount: 420 }],
    totalSales: 420, adjustments: 0, payable: 420, status: 'Paid', paidAt: daysAgo(0, 9, 40), paymentMethod: 'Cash', createdAt: daysAgo(1, 17),
  },
  {
    id: 'st-184', settlementCode: 'ST-00184', farmerId: 'f-ramon',
    periodStart: daysAgo(7, 8), periodEnd: daysAgo(0, 8),
    items: [{ saleId: 's-264', batchCode: 'KL-20260917-00485', productName: 'Squash', quantity: 12, farmerPrice: 40, farmerAmount: 480 }],
    totalSales: 480, adjustments: 0, payable: 480, status: 'Approved', createdAt: startOfToday(),
  },
]

const preorders: Preorder[] = [
  { id: 'po-01', buyerName: 'Harana Kitchen', requestedDate: daysAgo(-1, 8), status: 'Confirmed', items: [{ productId: p.tomatoes.id, requested: 20 }, { productId: p.eggplant.id, requested: 10 }] },
  { id: 'po-02', buyerName: 'Bravo Restaurant', requestedDate: daysAgo(-1, 8), status: 'Confirmed', items: [{ productId: p.banana.id, requested: 15 }] },
  { id: 'po-03', buyerName: 'Harana Kitchen', requestedDate: daysAgo(-3, 8), status: 'Requested', items: [{ productId: p.tomatoes.id, requested: 15 }, { productId: p.squash.id, requested: 8 }] },
  { id: 'po-04', buyerName: 'Mom\u2019s Kitchen', requestedDate: daysAgo(-2, 8), status: 'Requested', items: [{ productId: p.eggplant.id, requested: 12 }, { productId: p.banana.id, requested: 10 }] },
  { id: 'po-05', buyerName: 'Casa del Sol', requestedDate: daysAgo(-1, 8), status: 'Requested', items: [{ productId: p.coconut.id, requested: 18 }] },
]

const deliveryGroups = [
  { id: 'dg-01', groupCode: 'GRP-001', originHubId: 'hub-a', status: 'Received' as const, createdBy: 'm-staffa', sentBy: 'm-staffa', sentAt: daysAgo(4, 8), receivedBy: 'm-staffb', receivedAt: daysAgo(4, 9), createdAt: daysAgo(5, 8) },
  { id: 'dg-02', groupCode: 'GRP-002', originHubId: 'hub-a', status: 'Received' as const, createdBy: 'm-staffa', sentBy: 'm-staffa', sentAt: daysAgo(3, 14), receivedBy: 'm-staffb', receivedAt: daysAgo(3, 15), createdAt: daysAgo(3, 14) },
  { id: 'dg-03', groupCode: 'GRP-003', originHubId: 'hub-a', status: 'On the Way' as const, createdBy: 'm-staffa', sentBy: 'm-staffa', sentAt: daysAgo(1, 9), createdAt: daysAgo(4, 7) },
]

const notifications: Notification[] = [
  { id: 'n-01', type: 'delivery_received', title: 'Delivery received', message: 'Delivery group GRP-001 has been received at Hub B', targetMemberId: 'm-staffa', relatedEntityType: 'DeliveryGroup', relatedEntityId: 'dg-01', read: true, createdAt: daysAgo(4, 9) },
  { id: 'n-02', type: 'order_confirmed', title: 'Order created', message: 'Order ORD-001 created by Maria Lopez', targetMemberId: 'm-staffa', relatedEntityType: 'Order', relatedEntityId: 'ord-01', read: true, createdAt: daysAgo(2, 10) },
  { id: 'n-03', type: 'return_request', title: 'Return request', message: 'Return request RET-001 submitted for order ORD-001', targetMemberId: 'm-staffa', relatedEntityType: 'ReturnRequest', relatedEntityId: 'ret-01', read: false, createdAt: daysAgo(0, 9) },
]

const orders: Order[] = [
  {
    id: 'ord-01', orderCode: 'ORD-001', buyerName: 'Harana Kitchen', totalRevenue: 2500, paymentMethod: 'Cash' as const, status: 'Confirmed' as const, createdAt: daysAgo(2, 10), recordedBy: 'm-staffb',
    items: [
      { id: 'oi-01', productId: p.tomatoes.id, quantity: 15, unit: 'kg', unitPrice: 100, lineTotal: 1500 },
      { id: 'oi-02', productId: p.eggplant.id, quantity: 10, unit: 'kg', unitPrice: 100, lineTotal: 1000 },
    ],
  },
]

const farmerAllocations: FarmerAllocation[] = [
  { id: 'fa-01', orderItemId: 'oi-01', batchId: 'b-0481', farmerId: 'f-juan', productId: p.tomatoes.id, allocatedQuantity: 12.5, farmerPayout: 1000, createdAt: daysAgo(2, 10) },
  { id: 'fa-02', orderItemId: 'oi-01', batchId: 'b-0489', farmerId: 'f-maria', productId: p.tomatoes.id, allocatedQuantity: 2.5, farmerPayout: 200, createdAt: daysAgo(2, 10) },
  { id: 'fa-03', orderItemId: 'oi-02', batchId: 'b-0483', farmerId: 'f-pedro', productId: p.eggplant.id, allocatedQuantity: 10, farmerPayout: 900, createdAt: daysAgo(2, 10) },
]

const returnRequests: ReturnRequest[] = [
  {
    id: 'ret-01', returnCode: 'RET-001', orderId: 'ord-01', returnType: 'Normal' as const, reason: 'Customer returned 2 kg tomatoes — quality issue',
    notes: 'Tomatoes were slightly overripe', status: 'Pending Review' as const, requestedBy: 'm-staffb', createdAt: daysAgo(0, 9),
    items: [{ id: 'rri-01', productId: p.tomatoes.id, quantity: 2, unit: 'kg' }],
  },
]

export function buildSeed(): AppState {
  return {
    farmers,
    products: Object.values(p),
    deliveries,
    batches,
    sales,
    returns: [],
    settlements,
    preorders,
    audit: [
      { id: 'a-01', timestamp: daysAgo(5, 9, 14), action: 'Delivery created', entityType: 'Delivery', entityId: 'd-01', detail: '24.5 kg tomatoes from Juan Dela Cruz', by: 'Clark Suan' },
      { id: 'a-02', timestamp: daysAgo(5, 9, 21), action: 'Price confirmed', entityType: 'Batch', entityId: 'b-0481', detail: 'Farmer \u20b180 / LokalLab \u20b120 / Market \u20b1100 per kg', by: 'Clark Suan' },
      { id: 'a-03', timestamp: daysAgo(4, 6, 50), action: 'Transferred to Hub B', entityType: 'Batch', entityId: 'b-0481', detail: 'KL-20260916-00481', by: 'Clark Suan' },
      { id: 'a-04', timestamp: daysAgo(3, 11, 0), action: 'Sale recorded', entityType: 'Sale', entityId: 's-271', detail: '5 kg sold to Bravo Restaurant', by: 'Maria Lopez' },
      { id: 'a-05', timestamp: daysAgo(2, 14, 20), action: 'Sale recorded', entityType: 'Sale', entityId: 's-280', detail: '10 kg sold to Harana Kitchen', by: 'Maria Lopez' },
      { id: 'a-06', timestamp: daysAgo(1, 10, 5), action: 'Sale recorded', entityType: 'Sale', entityId: 's-281', detail: '7.5 kg sold to Walk-in customer', by: 'Maria Lopez' },
      { id: 'a-07', timestamp: daysAgo(0, 9, 40), action: 'Settlement paid', entityType: 'Settlement', entityId: 'st-182', detail: 'ST-00182 marked as paid', by: 'Admin User' },
    ],
    hubs,
    members,
    session: null,
    deliveryGroups,
    notifications,
    orders,
    returnRequests,
    farmerAllocations,
    authReady: false,
    dataReady: false,
    backend: 'local' as const,
    loadError: null,
  }
}