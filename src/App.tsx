import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginScreen } from './screens/LoginScreen'
import { AppShell } from './screens/AppShell'
import { HomeScreen } from './screens/HomeScreen'
import { ScanScreen } from './screens/ScanScreen'
import { EarningsScreen } from './screens/EarningsScreen'
import { WashersScreen } from './screens/WashersScreen'
import { MoreScreen } from './screens/MoreScreen'
import { Toast } from './components/Toast'

function App() {
  return (
    <BrowserRouter>
      <div className="h-screen w-screen overflow-hidden">
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Navigate to="/app/home" replace />} />
            <Route path="home" element={<HomeScreen />} />
            <Route path="scan" element={<ScanScreen />} />
            <Route path="earnings" element={<EarningsScreen />} />
            <Route path="washers" element={<WashersScreen />} />
            <Route path="more" element={<MoreScreen />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toast />
      </div>
    </BrowserRouter>
  )
}

export default App
