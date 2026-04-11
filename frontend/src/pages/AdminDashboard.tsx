import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../api/client"
import Layout from "../components/Layout"

interface Device {
  device_id: string
  chassis_serial: string
  device_type: string
  chassis_make_model: string
  status: string
  worker_id: string
  intake_timestamp: string
}

interface UserFormData {
  fname: string
  lname: string
  email: string
  username: string
  password: string
  role: string[]
}

const STATUS_CONFIG: Record<string, { label: string; bar: string; badge: string; dot: string }> = {
  intake:      { label: "Intake",      bar: "bg-slate-500",   badge: "bg-slate-800 text-slate-300",        dot: "bg-slate-400" },
  in_progress: { label: "In Progress", bar: "bg-orange-500",  badge: "bg-orange-900/40 text-orange-400",   dot: "bg-orange-500" },
  verified:    { label: "Verified",    bar: "bg-emerald-500", badge: "bg-emerald-900/40 text-emerald-400", dot: "bg-emerald-500" },
  documented:  { label: "Documented",  bar: "bg-emerald-500", badge: "bg-emerald-900/40 text-emerald-400", dot: "bg-emerald-500" },
  closed:      { label: "Closed",      bar: "bg-slate-600",   badge: "bg-slate-800 text-slate-400",        dot: "bg-slate-500" },
}

const DEVICE_LABELS: Record<string, string> = {
  laptop_hdd:         "Laptop HDD",
  laptop_ssd_sata:    "Laptop SATA SSD",
  laptop_ssd_nvme:    "Laptop NVMe SSD",
  desktop_hdd:        "Desktop HDD",
  desktop_ssd:        "Desktop SSD",
  tablet:             "Tablet",
  drive_external_hdd: "External HDD",
  drive_external_ssd: "External SSD",
  no_storage:         "No Storage",
}

const TABS = ["Overview", "Devices", "Workers", "Create User"] as const
type Tab = typeof TABS[number]

const EMPTY_FORM: UserFormData = {
  fname: "", lname: "", email: "", username: "", password: "", role: ["worker"],
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>("Overview")
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Create user form state
  const [formData, setFormData] = useState<UserFormData>(EMPTY_FORM)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState("")
  const [formSuccess, setFormSuccess] = useState("")

  useEffect(() => {
    api.get("/api/devices")
      .then((res) => setDevices(res.data.devices || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // ── Analytics derived from devices ──────────────────────────────────────
  const total = devices.length
  const completed = devices.filter((d) => d.status === "verified" || d.status === "documented" || d.status === "closed").length
  const inProgress = devices.filter((d) => d.status === "in_progress").length
  const intakeQueue = devices.filter((d) => d.status === "intake").length
  const complianceRate = total > 0 ? Math.round((completed / total) * 100) : 0

  // Status breakdown
  const statusCounts = Object.keys(STATUS_CONFIG).map((s) => ({
    key: s,
    count: devices.filter((d) => d.status === s).length,
  }))
  const maxStatusCount = Math.max(...statusCounts.map((s) => s.count), 1)

  // Device type breakdown
  const typeCounts = Object.entries(
    devices.reduce((acc, d) => {
      acc[d.device_type] = (acc[d.device_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1])
  const maxTypeCount = Math.max(...typeCounts.map((t) => t[1]), 1)

  // Worker leaderboard
  const workerStats = Object.entries(
    devices.reduce((acc, d) => {
      const w = d.worker_id || "unknown"
      if (!acc[w]) acc[w] = { total: 0, completed: 0 }
      acc[w].total++
      if (["verified", "documented", "closed"].includes(d.status)) acc[w].completed++
      return acc
    }, {} as Record<string, { total: number; completed: number }>)
  )
    .map(([worker, stats]) => ({ worker, ...stats }))
    .sort((a, b) => b.total - a.total)

  // Filtered devices for table
  const filteredDevices = devices.filter((d) => {
    const matchSearch =
      search === "" ||
      d.chassis_serial.toLowerCase().includes(search.toLowerCase()) ||
      d.chassis_make_model?.toLowerCase().includes(search.toLowerCase()) ||
      d.worker_id?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || d.status === statusFilter
    return matchSearch && matchStatus
  })

  // ── Create user handlers ─────────────────────────────────────────────────
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: name === "role" ? [value] : value }))
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")
    setFormSuccess("")
    setFormLoading(true)
    try {
      await api.post("/auth/users", formData)
      setFormSuccess(`User '${formData.username}' created successfully`)
      setFormData(EMPTY_FORM)
      setTimeout(() => setFormSuccess(""), 3000)
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Failed to create user. Please try again.")
    } finally {
      setFormLoading(false)
    }
  }

  // ── Shared tab button ────────────────────────────────────────────────────
  const TabBtn = ({ t }: { t: Tab }) => (
    <button
      onClick={() => setTab(t)}
      className={`px-5 py-2.5 text-sm font-bold rounded-lg transition-all ${
        tab === t
          ? "bg-orange-600 text-white"
          : "text-slate-400 hover:text-white hover:bg-slate-800"
      }`}
    >
      {t}
    </button>
  )

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Page header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
              Admin Analytics
            </h1>
            <p className="text-slate-400 mt-1 text-sm">Organization-wide device compliance overview</p>
          </div>
          <span className="text-xs font-bold text-orange-400 bg-orange-900/30 border border-orange-700/40 px-3 py-1.5 rounded-full uppercase tracking-wider">
            Admin View
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl w-fit">
          {TABS.map((t) => <TabBtn key={t} t={t} />)}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
        {tab === "Overview" && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Devices", value: total, icon: "devices", color: "text-white", bg: "bg-slate-800" },
                { label: "In Queue",      value: intakeQueue,  icon: "inbox",       color: "text-slate-300", bg: "bg-slate-800" },
                { label: "In Progress",   value: inProgress,   icon: "construction", color: "text-orange-400", bg: "bg-orange-900/30" },
                { label: "Completed",     value: completed,    icon: "task_alt",    color: "text-emerald-400", bg: "bg-emerald-900/30" },
              ].map(({ label, value, icon, color, bg }) => (
                <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                    <span className={`material-symbols-outlined text-2xl ${color}`}>{icon}</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">{label}</p>
                    <p className={`text-3xl font-black ${color}`}>{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status breakdown */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Status Breakdown</h3>
                <div className="space-y-4">
                  {statusCounts.map(({ key, count }) => {
                    const cfg = STATUS_CONFIG[key]
                    const pct = Math.round((count / maxStatusCount) * 100)
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-xs font-bold mb-1.5">
                          <span className="text-slate-300">{cfg.label}</span>
                          <span className="text-slate-500">{count} device{count !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div className={`${cfg.bar} h-full rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Device type breakdown */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Device Types</h3>
                {typeCounts.length === 0 ? (
                  <p className="text-slate-500 text-sm">No devices yet.</p>
                ) : (
                  <div className="space-y-4">
                    {typeCounts.map(([type, count]) => {
                      const pct = Math.round((count / maxTypeCount) * 100)
                      return (
                        <div key={type}>
                          <div className="flex justify-between text-xs font-bold mb-1.5">
                            <span className="text-slate-300">{DEVICE_LABELS[type] || type}</span>
                            <span className="text-slate-500">{count}</span>
                          </div>
                          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                            <div className="bg-orange-600 h-full rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Global compliance rate */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Global Compliance Rate</p>
                <p className="text-5xl font-black text-white">{complianceRate}<span className="text-2xl text-slate-400">%</span></p>
                <p className="text-xs text-slate-500 mt-2">{completed} of {total} devices fully processed</p>
              </div>
              <div className="relative w-28 h-28 flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9"
                    fill="none"
                    stroke={complianceRate >= 80 ? "#10b981" : complianceRate >= 50 ? "#f97316" : "#ef4444"}
                    strokeWidth="3"
                    strokeDasharray={`${complianceRate} ${100 - complianceRate}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-emerald-400 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── DEVICES TAB ──────────────────────────────────────────────── */}
        {tab === "Devices" && (
          <div className="space-y-4">
            {/* Search + filter bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
                <input
                  type="text"
                  placeholder="Search by serial, make/model, or worker..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-slate-100 text-sm placeholder-slate-500 focus:ring-2 focus:ring-orange-600 outline-none"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 outline-none"
              >
                <option value="all">All Statuses</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/40 flex items-center justify-between">
                <span className="text-sm font-bold text-white">All Devices</span>
                <span className="text-xs text-slate-400">{filteredDevices.length} result{filteredDevices.length !== 1 ? "s" : ""}</span>
              </div>

              {loading ? (
                <div className="p-10 text-center text-slate-400">Loading...</div>
              ) : filteredDevices.length === 0 ? (
                <div className="p-10 text-center text-slate-500">No devices match your search.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800">
                        <th className="px-6 py-3">Serial</th>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">Make / Model</th>
                        <th className="px-6 py-3">Worker</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredDevices.map((d) => {
                        const cfg = STATUS_CONFIG[d.status] ?? STATUS_CONFIG.intake
                        return (
                          <tr key={d.device_id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-6 py-3 font-mono text-sm text-slate-200">{d.chassis_serial}</td>
                            <td className="px-6 py-3 text-sm text-slate-300">{DEVICE_LABELS[d.device_type] || d.device_type}</td>
                            <td className="px-6 py-3 text-sm text-slate-300">{d.chassis_make_model}</td>
                            <td className="px-6 py-3 text-sm text-slate-400 font-mono">{d.worker_id || "—"}</td>
                            <td className="px-6 py-3">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.badge}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                {cfg.label}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-right">
                              <button
                                onClick={() => navigate(`/device/${d.device_id}`)}
                                className="bg-slate-100 text-slate-900 text-xs font-bold px-3 py-1.5 rounded hover:opacity-90 transition-all active:scale-95"
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
          </div>
        )}

        {/* ── WORKERS TAB ──────────────────────────────────────────────── */}
        {tab === "Workers" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/40">
                <span className="text-sm font-bold text-white">Worker Leaderboard</span>
              </div>
              {workerStats.length === 0 ? (
                <div className="p-10 text-center text-slate-500">No devices recorded yet.</div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {workerStats.map(({ worker, total: wTotal, completed: wCompleted }, i) => {
                    const rate = wTotal > 0 ? Math.round((wCompleted / wTotal) * 100) : 0
                    return (
                      <div key={worker} className="flex items-center gap-5 px-6 py-4 hover:bg-slate-800/30 transition-colors">
                        {/* Rank */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${
                          i === 0 ? "bg-yellow-500/20 text-yellow-400" :
                          i === 1 ? "bg-slate-400/10 text-slate-300" :
                          i === 2 ? "bg-orange-900/30 text-orange-400" :
                          "bg-slate-800 text-slate-500"
                        }`}>
                          {i + 1}
                        </div>
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {worker.slice(0, 2).toUpperCase()}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-sm">{worker}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-orange-600 h-full rounded-full" style={{ width: `${rate}%` }} />
                            </div>
                            <span className="text-xs text-slate-400 font-mono flex-shrink-0">{rate}%</span>
                          </div>
                        </div>
                        {/* Stats */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-black text-white">{wTotal}</p>
                          <p className="text-xs text-slate-500">{wCompleted} completed</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wide mb-1">Active Workers</p>
                <p className="text-3xl font-black text-white">{workerStats.length}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wide mb-1">Avg Devices / Worker</p>
                <p className="text-3xl font-black text-white">
                  {workerStats.length > 0 ? Math.round(total / workerStats.length) : 0}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── CREATE USER TAB ───────────────────────────────────────────── */}
        {tab === "Create User" && (
          <div className="max-w-xl">
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/40">
                <span className="text-sm font-bold text-white">Create New User Account</span>
              </div>
              <form onSubmit={handleCreateUser} className="p-6 space-y-5">
                {formError && (
                  <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">{formError}</div>
                )}
                {formSuccess && (
                  <div className="p-4 bg-emerald-900/30 border border-emerald-700 rounded-lg text-emerald-300 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    {formSuccess}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { name: "fname", label: "First Name", placeholder: "John" },
                    { name: "lname", label: "Last Name",  placeholder: "Doe" },
                  ].map(({ name, label, placeholder }) => (
                    <div key={name}>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">{label}</label>
                      <input
                        type="text" name={name} value={(formData as any)[name]}
                        onChange={handleFormChange} placeholder={placeholder} required
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 text-sm placeholder-slate-500 focus:ring-2 focus:ring-orange-600 outline-none"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Email</label>
                  <input
                    type="email" name="email" value={formData.email}
                    onChange={handleFormChange} placeholder="john@cityserve.local" required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 text-sm placeholder-slate-500 focus:ring-2 focus:ring-orange-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Username</label>
                  <input
                    type="text" name="username" value={formData.username}
                    onChange={handleFormChange} placeholder="jdoe" required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 text-sm placeholder-slate-500 focus:ring-2 focus:ring-orange-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Password</label>
                  <input
                    type="password" name="password" value={formData.password}
                    onChange={handleFormChange} placeholder="••••••••" required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 text-sm placeholder-slate-500 focus:ring-2 focus:ring-orange-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Role</label>
                  <select
                    name="role" value={formData.role[0]} onChange={handleFormChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 outline-none"
                  >
                    <option value="worker">Worker — can process devices</option>
                    <option value="admin">Admin — can manage users + view analytics</option>
                  </select>
                </div>

                <button
                  type="submit" disabled={formLoading}
                  className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">person_add</span>
                  {formLoading ? "Creating..." : "Create User"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
