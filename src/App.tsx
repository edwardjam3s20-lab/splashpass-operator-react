import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginScreen } from './screens/LoginScreen'
import { AppShell } from './screens/AppShell'
import { DashboardScreen } from './screens/DashboardScreen'
import { QueueScreen } from './screens/QueueScreen'
import { ScanScreen } from './screens/ScanScreen'
import { TeamScreen } from './screens/TeamScreen'
import { EarningsScreen } from './screens/EarningsScreen'
import { WashersScreen } from './screens/WashersScreen'
import { ServicesScreen } from './screens/ServicesScreen'
import { MoreScreen } from './screens/MoreScreen'
import { ChangePasswordScreen } from './screens/ChangePasswordScreen'
import { Toast } from './components/Toast'

function App() {
  return (
    <BrowserRouter>
      <div className="h-screen w-screen overflow-hidden">
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardScreen />} />
            <Route path="queue" element={<QueueScreen />} />
            <Route path="scan" element={<ScanScreen />} />
            <Route path="team" element={<TeamScreen />} />
            <Route path="team/roster" element={<WashersScreen />} />
            <Route path="more" element={<MoreScreen />} />
            <Route path="more/change-password" element={<ChangePasswordScreen />} />
            <Route path="more/earnings" element={<EarningsScreen />} />
            <Route path="more/services" element={<ServicesScreen />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toast />
      </div>
    </BrowserRouter>
  )
}

export default App
