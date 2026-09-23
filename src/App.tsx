import { Route, Routes, Navigate } from 'react-router-dom'
import './App.css'
import { AppShell } from './components/layout'
import { RequireAuth, RequireRole } from './components/AuthGuards'
import {
  ConsignmentDetail,
  Deliveries,
  DeliveryDetail,
  Demand,
  FarmerDetail,
  Farmers,
  Login,
  Market,
  Members,
  Overview,
  Reports,
  Sales,
  Settlements,
  SettlementDetail,
  Settings,
  Notifications,
  Orders,
  OrderDetail,
  Returns,
  ReturnDetail,
  Products,
} from './pages'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <AppShell>
              <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/farmers" element={<Farmers />} />
                <Route path="/farmers/:id" element={<FarmerDetail />} />
                <Route path="/deliveries" element={<Deliveries />} />
                <Route path="/deliveries/:id" element={<DeliveryDetail />} />
                <Route path="/market" element={<Market />} />
                <Route path="/market/:id" element={<ConsignmentDetail />} />
                <Route path="/sales" element={<Sales />} />
                <Route
                  path="/settlements"
                  element={<RequireRole roles={['Admin', 'Staff A']}><Settlements /></RequireRole>}
                />
                <Route
                  path="/settlements/:id"
                  element={<RequireRole roles={['Admin', 'Staff A']}><SettlementDetail /></RequireRole>}
                />
                <Route path="/demand" element={<Demand />} />
                <Route path="/reports/*" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/members" element={<RequireRole roles={['Admin']}><Members /></RequireRole>} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/orders/:id" element={<OrderDetail />} />
                <Route path="/returns" element={<Returns />} />
                <Route path="/returns/:id" element={<ReturnDetail />} />
                <Route path="/products" element={<Products />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          </RequireAuth>
        }
      />
    </Routes>
  )
}
