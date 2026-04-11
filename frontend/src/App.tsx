import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { useEffect, useState } from "react"
import Dashboard from "./pages/Dashboard"
import DeviceIntake from "./pages/DeviceIntake"
import DeviceDetail from "./pages/DeviceDetail"
import ComplianceRecord from "./pages/ComplianceRecord"
import SearchDevices from "./pages/SearchDevices"

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
        <Route path="/intake" element={<DeviceIntake />} />
        <Route path="/device/:id" element={<DeviceDetail />} />
        <Route path="/compliance/:id" element={<ComplianceRecord />} />
      </Routes>
    </Router>
  )
}
