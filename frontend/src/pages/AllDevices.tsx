import { useState, useEffect } from "react"
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

const STATUS_CONFIG: Record<string, { color: string; label: string; dot: string }> = {
  intake:      { color: "bg-slate-800 text-slate-300",        dot: "bg-slate-400",   label: "Intake" },
  in_progress: { color: "bg-orange-900/40 text-orange-400",   dot: "bg-orange-600",  label: "In Progress" },
  verified:    { color: "bg-emerald-900/40 text-emerald-400", dot: "bg-emerald-500", label: "Verified" },
  documented:  { color: "bg-emerald-900/40 text-emerald-400", dot: "bg-emerald-500", label: "Documented" },
  closed:      { color: "bg-slate-800 text-slate-400",        dot: "bg-slate-500",   label: "Closed" },
}

const DEVICE_ICON: Record<string, string> = {
  laptop_hdd:         "laptop_mac",
  laptop_ssd:         "laptop_mac",
  laptop_ssd_sata:    "laptop_mac",
  laptop_ssd_nvme:    "laptop_mac",
  desktop_hdd:        "computer",
  desktop_ssd:        "computer",
  tablet:             "tablet",
  phone:              "smartphone",
  drive_external:     "hard_drive",
  drive_external_hdd: "hard_drive",
  drive_external_ssd: "hard_drive",
  no_storage:         "devices",
}

const ITEMS_PER_PAGE = 12

export default function AllDevices() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await api.get("/api/devices")
        setDevices(res.data.devices || [])
      } catch (error) {
        console.error("Failed to load devices:", error)
        setDevices([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const totalPages = Math.ceil(devices.length / ITEMS_PER_PAGE)
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE
  const endIdx = startIdx + ITEMS_PER_PAGE
  const currentDevices = devices.slice(startIdx, endIdx)

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
      window.scrollTo(0, 0)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
      window.scrollTo(0, 0)
    }
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">All Devices</h1>
            <p className="text-slate-400 mt-1">Complete list of all devices in the system.</p>
          </div>
          <button
            onClick={() => navigate("/intake")}
            className="bg-orange-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-700 transition flex items-center gap-2 active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Intake New Device
          </button>
        </section>

        {/* Summary Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
            <p className="text-sm font-medium text-slate-400 mb-1">Total Devices</p>
            <h2 className="text-3xl font-black text-white">{devices.length}</h2>
          </div>
          <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
            <p className="text-sm font-medium text-slate-400 mb-1">Current Page</p>
            <h2 className="text-3xl font-black text-orange-500">{currentPage}</h2>
          </div>
          <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
            <p className="text-sm font-medium text-slate-400 mb-1">Total Pages</p>
            <h2 className="text-3xl font-black text-emerald-500">{totalPages}</h2>
          </div>
        </section>

        {/* Devices Table */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/50">
            <h3 className="font-bold text-white" style={{ fontFamily: "Manrope, sans-serif" }}>
              {loading ? "Loading..." : `Devices ${startIdx + 1}–${Math.min(endIdx, devices.length)} of ${devices.length}`}
            </h3>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading devices...</div>
          ) : devices.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No devices yet. Intake one to get started!</div>
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
                  {currentDevices.map((device) => {
                    const cfg = STATUS_CONFIG[device.status] ?? STATUS_CONFIG.intake
                    const icon = DEVICE_ICON[device.device_type] ?? "devices"
                    return (
                      <tr key={device.device_id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4 font-mono text-sm text-slate-200">{device.chassis_serial}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-400 text-lg">{icon}</span>
                            <span className="text-sm font-medium text-slate-300">{device.device_type.replace(/_/g, " ")}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">{device.make_model}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => navigate(`/device/${device.device_id}`)}
                            className="bg-slate-100 text-slate-900 text-xs font-bold px-4 py-1.5 rounded hover:opacity-90 active:scale-95 transition-all"
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
        </div>

        {/* Pagination Controls */}
        {!loading && devices.length > 0 && (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Previous
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => {
                    setCurrentPage(page)
                    window.scrollTo(0, 0)
                  }}
                  className={`w-10 h-10 rounded-lg font-bold transition-all active:scale-95 ${
                    currentPage === page
                      ? "bg-orange-600 text-white"
                      : "border border-slate-700 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              Next
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
