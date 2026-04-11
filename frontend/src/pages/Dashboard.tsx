import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import type { AxiosError } from "axios"
import { api } from "../api/client"
import Layout from "../components/Layout"

interface DeviceStats {
  total: number
  in_progress: number
  completed: number
  by_type: Record<string, number>
}

interface Device {
  device_id: string
  chassis_serial?: string
  device_type?: string
  make_model?: string
  chassis_make_model?: string
  status?: string
  worker_id?: string
  intake_timestamp?: string
}

interface DeviceCreateResponse {
  device_id: string
  procedure_id: string
  status: string
}

const DEVICE_TYPES = [
  { value: "laptop_hdd", label: "Laptop HDD" },
  { value: "laptop_ssd_sata", label: "Laptop SATA SSD" },
  { value: "laptop_ssd_nvme", label: "Laptop NVMe SSD" },
  { value: "desktop_hdd", label: "Desktop HDD" },
  { value: "desktop_ssd", label: "Desktop SSD" },
  { value: "tablet", label: "Tablet / Mobile" },
  { value: "drive_external_hdd", label: "External HDD" },
  { value: "drive_external_ssd", label: "External SSD" },
  { value: "no_storage", label: "No Storage" },
]

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

export default function Dashboard() {
  const [stats, setStats] = useState<DeviceStats>({ total: 0, in_progress: 0, completed: 0, by_type: {} })
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState("")
  const [quickAdd, setQuickAdd] = useState({
    chassis_serial: "",
    device_type: "laptop_hdd",
    make_model: "",
  })
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [statsRes, devicesRes] = await Promise.all([
          api.get("/api/dashboard"),
          api.get("/api/devices"),
        ])
        setStats(statsRes.data)
        setDevices(devicesRes.data.devices || [])
      } catch {
        // show zeros on error
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const completedPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
  const inProgressPct = stats.total > 0 ? Math.round((stats.in_progress / stats.total) * 100) : 0

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (addLoading) return

    setAddError("")
    setAddLoading(true)

    try {
      const response = await api.post<DeviceCreateResponse>("/api/devices", quickAdd)
      const created = response.data
      const now = new Date().toISOString()

      const newDevice: Device = {
        device_id: created.device_id,
        chassis_serial: quickAdd.chassis_serial,
        device_type: quickAdd.device_type,
        make_model: quickAdd.make_model,
        status: created.status || "intake",
        worker_id: "",
        intake_timestamp: now,
      }

      setDevices((prev) => [newDevice, ...prev])
      setStats((prev) => ({
        ...prev,
        total: prev.total + 1,
      }))
      setQuickAdd({
        chassis_serial: "",
        device_type: "laptop_hdd",
        make_model: "",
      })
      navigate(`/device/${created.device_id}`)
    } catch (error: unknown) {
      const err = error as AxiosError<{ detail?: string }>
      setAddError(err.response?.data?.detail || "Failed to add device. Please try again.")
    } finally {
      setAddLoading(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Device Dashboard</h1>
            <p className="text-slate-400 mt-1">Real-time overview of compliance and intake status.</p>
          </div>
          <button
            onClick={() => navigate("/intake")}
            className="bg-orange-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-700 transition flex items-center gap-2 active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Intake New Device
          </button>
        </section>

        {/* Stat Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 p-6 rounded-lg border border-slate-800 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400 mb-1">Total Devices</p>
              <h2 className="text-4xl font-black text-white">{stats.total}</h2>
            </div>
            <div className="w-12 h-12 rounded bg-slate-800 flex items-center justify-center text-slate-300">
              <span className="material-symbols-outlined text-3xl">devices</span>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-lg border border-slate-800 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400 mb-1">In Progress</p>
              <h2 className="text-4xl font-black text-orange-500">{stats.in_progress}</h2>
              <div className="mt-3 h-2 w-32 bg-slate-800 rounded-full overflow-hidden">
                <div className="bg-orange-600 h-full rounded-full transition-all" style={{ width: `${inProgressPct}%` }} />
              </div>
            </div>
            <div className="w-12 h-12 rounded bg-orange-900/30 flex items-center justify-center text-orange-500">
              <span className="material-symbols-outlined text-3xl">construction</span>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-lg border border-slate-800 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400 mb-1">Completed</p>
              <h2 className="text-4xl font-black text-emerald-500">{stats.completed}</h2>
              <p className="text-xs text-emerald-400 font-bold mt-1">{completedPct}% completion rate</p>
            </div>
            <div className="w-12 h-12 rounded bg-emerald-900/30 flex items-center justify-center text-emerald-500">
              <span className="material-symbols-outlined text-3xl">task_alt</span>
            </div>
          </div>
        </section>

        {/* Recent Devices Table */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
            <h3 className="font-bold text-white" style={{ fontFamily: "Manrope, sans-serif" }}>Recent Devices</h3>
            <span className="text-xs font-bold text-green-400 bg-green-900/30 px-2 py-1 rounded">LIVE FEED</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading...</div>
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
                  {devices.slice(0, 8).map((device) => {
                    const status = device.status || "intake"
                    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.intake
                    const deviceType = device.device_type || "unknown"
                    const icon = DEVICE_ICON[deviceType] ?? "devices"
                    return (
                      <tr key={device.device_id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4 font-mono text-sm text-slate-200">{device.chassis_serial || "-"}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-400 text-lg">{icon}</span>
                            <span className="text-sm font-medium text-slate-300">{deviceType.replace(/_/g, " ")}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">{device.make_model || device.chassis_make_model || "-"}</td>
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

          <div className="px-6 py-4 bg-slate-800/20 flex justify-center border-t border-slate-800">
            <button onClick={() => navigate("/devices")} className="text-sm font-semibold text-slate-500 hover:text-orange-500 transition-colors">
              View All Devices
            </button>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 bg-slate-950 border border-slate-800 rounded-lg p-8 relative overflow-hidden group">
            <div className="relative z-10">
              <h4 className="text-orange-500 font-bold uppercase tracking-widest text-xs mb-4">Quick Add</h4>
              <h3 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>
                Add Device From Dashboard
              </h3>
              <p className="text-slate-400 mb-6 max-w-md text-sm leading-relaxed">
                Register a new device without leaving this page. It will immediately appear in the recent devices feed.
              </p>

              <form onSubmit={handleQuickAddSubmit} className="space-y-4 max-w-xl">
                {addError && (
                  <div className="p-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">
                    {addError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Chassis Serial"
                    value={quickAdd.chassis_serial}
                    onChange={(e) => setQuickAdd((prev) => ({ ...prev, chassis_serial: e.target.value }))}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Make / Model"
                    value={quickAdd.make_model}
                    onChange={(e) => setQuickAdd((prev) => ({ ...prev, make_model: e.target.value }))}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none"
                  />
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                  <select
                    value={quickAdd.device_type}
                    onChange={(e) => setQuickAdd((prev) => ({ ...prev, device_type: e.target.value }))}
                    className="w-full md:w-auto bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none"
                  >
                    {DEVICE_TYPES.map((deviceType) => (
                      <option key={deviceType.value} value={deviceType.value}>{deviceType.label}</option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    disabled={addLoading}
                    className="bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-bold py-2.5 px-6 rounded flex items-center gap-2 transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                    {addLoading ? "Adding..." : "Add Device"}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/intake")}
                    className="text-sm font-semibold text-slate-400 hover:text-orange-500 transition-colors"
                  >
                    Open full intake form
                  </button>
                </div>
              </form>
            </div>
            <div className="absolute -right-8 -bottom-8 opacity-10 scale-150 rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none">
              <span className="material-symbols-outlined text-[160px] text-white">inventory_2</span>
            </div>
          </div>

          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h3 className="font-bold text-white mb-5" style={{ fontFamily: "Manrope, sans-serif" }}>Compliance Distribution</h3>
            <div className="space-y-4">
              {[
                { label: "Mobile Units",  pct: 88 },
                { label: "Workstations",  pct: 94 },
                { label: "Field Tablets", pct: 72 },
              ].map(({ label, pct }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs font-bold mb-1 uppercase tracking-wider text-slate-400">
                    <span>{label}</span><span>{pct}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-orange-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">96.4%</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Compliance Rating</p>
              </div>
              <span className="material-symbols-outlined text-emerald-500 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
