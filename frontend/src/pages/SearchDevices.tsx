import { useState } from "react"
import { useNavigate } from "react-router-dom"
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

const DEVICE_TYPES = [
  "laptop_hdd",
  "laptop_ssd",
  "laptop_ssd_sata",
  "laptop_ssd_nvme",
  "desktop_hdd",
  "desktop_ssd",
  "tablet",
  "drive_external",
  "drive_external_hdd",
  "drive_external_ssd",
  "no_storage",
]

const STATUSES = ["intake", "in_progress", "verified", "documented", "closed"]

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  intake: { color: "bg-slate-800 text-slate-300", label: "Intake" },
  in_progress: { color: "bg-orange-900/40 text-orange-400", label: "In Progress" },
  verified: { color: "bg-emerald-900/40 text-emerald-400", label: "Verified" },
  documented: { color: "bg-emerald-900/40 text-emerald-400", label: "Documented" },
  closed: { color: "bg-slate-800 text-slate-400", label: "Closed" },
}

export default function SearchDevices() {
  const [query, setQuery] = useState("")
  const [filters, setFilters] = useState({
    device_type: "",
    status: "",
    serial: "",
    make_model: "",
  })
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const navigate = useNavigate()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSearched(true)

    try {
      const params = {
        q: query,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v.trim() !== "")
        ),
      }

      const res = await api.get("/api/devices/search", { params })
      setDevices(res.data.devices || [])
    } catch (error) {
      console.error("Failed to search devices:", error)
      setDevices([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleClearFilters = () => {
    setQuery("")
    setFilters({
      device_type: "",
      status: "",
      serial: "",
      make_model: "",
    })
    setSearched(false)
    setDevices([])
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <section>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Search Devices</h1>
          <p className="text-slate-400 mt-1">Find devices by type, serial number, make/model, or status</p>
        </section>

        {/* Search & Filter Form */}
        <section className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Keyword Search */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Keyword Search
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input
                  type="text"
                  placeholder="Search across all fields..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
              </div>
            </div>

            {/* Filter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Device Type */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Device Type
                </label>
                <select
                  value={filters.device_type}
                  onChange={(e) => handleFilterChange("device_type", e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-600"
                >
                  <option value="">All Types</option>
                  {DEVICE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-600"
                >
                  <option value="">All Statuses</option>
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.replace(/_/g, " ").toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Serial Number */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Serial Number
                </label>
                <input
                  type="text"
                  placeholder="Partial match..."
                  value={filters.serial}
                  onChange={(e) => handleFilterChange("serial", e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
              </div>

              {/* Make/Model */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Make/Model
                </label>
                <input
                  type="text"
                  placeholder="Partial match..."
                  value={filters.make_model}
                  onChange={(e) => handleFilterChange("make_model", e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-700 transition flex items-center gap-2 active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">search</span>
                Search
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="border border-slate-700 text-slate-300 px-6 py-2 rounded-lg font-bold hover:bg-slate-800 transition"
              >
                Clear Filters
              </button>
            </div>
          </form>
        </section>

        {/* Results */}
        {searched && (
          <section className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/50">
              <h3 className="font-bold text-white" style={{ fontFamily: "Manrope, sans-serif" }}>
                {loading ? "Searching..." : `Results (${devices.length})`}
              </h3>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400">
                Searching...
              </div>
            ) : devices.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No devices found matching your search
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800">
                      <th className="px-6 py-4">Serial</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Make / Model</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {devices.map((device) => {
                      const cfg = STATUS_CONFIG[device.status] ?? STATUS_CONFIG.intake
                      return (
                        <tr
                          key={device.device_id}
                          className="hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="px-6 py-4 font-mono text-sm text-slate-200">
                            {device.chassis_serial}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300">
                            {device.device_type.replace(/_/g, " ")}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300">
                            {device.make_model}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => navigate(`/device/${device.device_id}`)}
                              className="text-orange-500 hover:text-orange-400 font-bold text-sm transition-colors"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      )
                    })}
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
