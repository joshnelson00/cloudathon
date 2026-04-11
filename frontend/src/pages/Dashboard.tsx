import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  FiBarChart2,
  FiZap,
  FiCheckCircle,
  FiPlus,
  FiSearch,
} from "react-icons/fi"
import { api } from "../api/client"
import Layout from "../components/Layout"

interface DeviceStats {
  total: number
  intake: number
  in_progress: number
  verified: number
  documented: number
  by_type: Record<string, number>
}

interface Device {
  device_id: string
  chassis_serial: string
  device_type: string
  make_model: string
  status: string
  intake_timestamp: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<DeviceStats>({
    total: 0,
    intake: 0,
    in_progress: 0,
    verified: 0,
    documented: 0,
    by_type: {},
  })
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [statsRes, devicesRes] = await Promise.all([
        api.get("/api/dashboard"),
        api.get("/api/devices"),
      ])

      setStats(statsRes.data)
      setDevices(devicesRes.data.devices || [])
    } catch (error) {
      console.error("Failed to load dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      intake: { color: "bg-blue-100 text-blue-800", label: "INTAKE QUEUE" },
      in_progress: {
        color: "bg-amber-100 text-amber-800",
        label: "IN PROGRESS",
      },
      verified: { color: "bg-green-100 text-green-800", label: "VERIFIED" },
      documented: {
        color: "bg-green-100 text-green-800",
        label: "DOCUMENTED",
      },
      closed: { color: "bg-gray-100 text-gray-800", label: "CLOSED" },
    }

    const config = statusConfig[status] || statusConfig.intake
    return (
      <span className={`px-2 py-1 rounded text-xs font-bold ${config.color}`}>
        {config.label}
      </span>
    )
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header Section */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-1">
              System Overview
            </h2>
            <p className="text-gray-600">CityServe Device Destruction System</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/search")}
              className="border border-gray-700 text-gray-700 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition flex items-center gap-2"
            >
              <FiSearch className="w-5 h-5" />
              Search Devices
            </button>
            <button
              onClick={() => navigate("/intake")}
              className="bg-gray-700 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 transition flex items-center gap-2"
            >
              <FiPlus className="w-5 h-5" />
              Intake New Device
            </button>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-bold uppercase text-gray-600 tracking-wide">
                Total Devices
              </p>
              <FiBarChart2 className="text-2xl text-gray-700" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {stats.total}
              </span>
              {stats.total > 0 && (
                <span className="text-gray-600 font-bold text-sm">All Time</span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-bold uppercase text-gray-600 tracking-wide">
                In-Progress
              </p>
              <FiZap className="text-2xl text-gray-700" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {stats.in_progress}
              </span>
              <span className="text-gray-600 font-bold text-sm">Active</span>
            </div>
            <div className="mt-4 flex gap-1 h-2 w-full bg-gray-200 rounded overflow-hidden">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={
                    i < Math.ceil((stats.in_progress / stats.total) * 10)
                      ? "flex-1 bg-gray-700"
                      : "flex-1 bg-gray-300"
                  }
                />
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-bold uppercase text-gray-600 tracking-wide">
                Completed
              </p>
              <FiCheckCircle className="text-2xl text-gray-700" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {stats.documented}
              </span>
              <span className="text-gray-600 font-bold text-sm">
                {stats.total > 0
                  ? `${Math.round((stats.documented / stats.total) * 100)}%`
                  : "0%"}
              </span>
            </div>
          </div>
        </section>

        {/* Live Feed Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">
              Live Feed: Recent Devices
            </h3>
            <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded">
              SYSTEM ONLINE
            </span>
          </div>
          {loading ? (
            <div className="p-6 text-center text-gray-600">Loading...</div>
          ) : devices.length === 0 ? (
            <div className="p-6 text-center text-gray-600">
              No devices yet. Create one to get started!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Serial Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Worker
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {devices.slice(0, 5).map((device) => (
                    <tr
                      key={device.device_id}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-blue-600">
                        {device.chassis_serial}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {device.device_type}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(device.status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {device.worker_id}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => navigate(`/device/${device.device_id}`)}
                          className="text-blue-600 hover:underline font-bold text-sm"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
