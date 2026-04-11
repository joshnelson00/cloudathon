import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { useEffect, useState } from "react"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import DeviceIntake from "./pages/DeviceIntake"
import DeviceDetail from "./pages/DeviceDetail"
import ComplianceRecord from "./pages/ComplianceRecord"

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token")
  return token ? <>{children}</> : <Navigate to="/login" />
}

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
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/intake"
          element={
            <PrivateRoute>
              <DeviceIntake />
            </PrivateRoute>
          }
        />
        <Route
          path="/device/:id"
          element={
            <PrivateRoute>
              <DeviceDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/compliance/:id"
          element={
            <PrivateRoute>
              <ComplianceRecord />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  )
}
