import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { useEffect, useState } from "react"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import DeviceIntake from "./pages/DeviceIntake"
import DeviceDetail from "./pages/DeviceDetail"
import ComplianceRecord from "./pages/ComplianceRecord"
import AdminUsers from "./pages/AdminUsers"

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
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/intake" element={<DeviceIntake />} />
        <Route path="/device/:id" element={<DeviceDetail />} />
        <Route path="/compliance/:id" element={<ComplianceRecord />} />
        <Route path="/admin/users" element={<AdminUsers />} />
      </Routes>
    </Router>
  )
}
