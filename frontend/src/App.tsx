import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { useEffect, useState } from "react"
import Dashboard from "./pages/Dashboard"
import DeviceIntake from "./pages/DeviceIntake"
import DeviceDetail from "./pages/DeviceDetail"
import ComplianceRecord from "./pages/ComplianceRecord"
import SearchDevices from "./pages/SearchDevices"
import AllDevices from "./pages/AllDevices"
import Analytics from "./pages/Analytics"
import AdminDashboard from "./pages/AdminDashboard"
import DriveTypeIdentification from "./pages/DriveTypeIdentification"

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Small delay to ensure DOM is ready
    setReady(true)
  }, [])

  if (!ready) return null

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/search" element={<SearchDevices />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/devices" element={<AllDevices />} />
        <Route path="/intake" element={<DeviceIntake />} />
        <Route path="/device/:id" element={<DeviceDetail />} />
        <Route path="/compliance/:id" element={<ComplianceRecord />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/identify-drive" element={<DriveTypeIdentification />} />
      </Routes>
    </Router>
  )
}
