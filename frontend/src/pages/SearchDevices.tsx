import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { FiSearch, FiArrowLeft } from "react-icons/fi"
import { api } from "../api/client"
import Layout from "../components/Layout"

interface Device {
  device_id: string
  chassis_serial: string
  device_type: string
  make_model: string
  status: string
  intake_timestamp: string
}

export default function SearchDevices() {
  const [query, setQuery] = useState("")
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const navigate = useNavigate()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSearched(true)

    try {
      const res = await api.get("/api/devices/search", {
        params: { q: query },
      })
      setDevices(res.data.devices || [])
    } catch (error) {
      console.error("Failed to search devices:", error)
      setDevices([])
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
        {/* Header */}
        <section>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-bold mb-4"
          >
            <FiArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <h2 className="text-3xl font-bold text-gray-900">Search Devices</h2>
          <p className="text-gray-600 mt-1">
            Find devices by type, serial number, make/model, or status
          </p>
        </section>

        {/* Search Form */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by device type, serial, make/model, or status..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="bg-gray-700 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-800 transition"
            >
              Search
            </button>
          </form>
        </section>

        {/* Results */}
        {searched && (
          <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                {loading ? "Searching..." : `Results (${devices.length})`}
              </h3>
            </div>

            {loading ? (
              <div className="p-6 text-center text-gray-600">
                Searching...
              </div>
            ) : devices.length === 0 ? (
              <div className="p-6 text-center text-gray-600">
                No devices found matching "{query}"
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
                        Make/Model
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map((device) => (
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
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {device.make_model}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(device.status)}
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
          </section>
        )}
      </div>
    </Layout>
  )
}
