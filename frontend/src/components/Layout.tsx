import { ReactNode, useState, useEffect, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { api } from "../api/client"

interface LayoutProps {
  children: ReactNode
  showNav?: boolean
}

const DEVICE_TYPE_LABELS: Record<string, string> = {
  laptop_hdd: "Laptop HDD",
  laptop_ssd_sata: "Laptop SATA SSD",
  laptop_ssd_nvme: "Laptop NVMe SSD",
  desktop_hdd: "Desktop HDD",
  desktop_ssd: "Desktop SSD",
  tablet: "Tablet",
  drive_external_hdd: "External HDD",
  drive_external_ssd: "External SSD",
  no_storage: "No Storage",
}

export default function Layout({ children, showNav = true }: Readonly<LayoutProps>) {
  const navigate = useNavigate()
  const location = useLocation()
  const [notifOpen, setNotifOpen] = useState(false)
  const [pendingDevices, setPendingDevices] = useState<any[]>([])
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get("/api/devices").then((res) => {
      const all = res.data.devices || []
      const pending = all.filter((d: any) => d.status === "intake" || d.status === "in_progress")
      setPendingDevices(pending)
    }).catch(() => {})
  }, [location.pathname])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("role")
    localStorage.removeItem("username")
    navigate("/login")
  }

  const role = localStorage.getItem("role")
  const username = localStorage.getItem("username") || "dwight_ferris"

  const navLinks = [
    { path: "/", label: "Dashboard", icon: "dashboard" },
    { path: "/analytics", label: "AI Insights", icon: "insights" },
    { path: "/search", label: "Search Devices", icon: "search" },
    { path: "/intake", label: "Intake New Device", icon: "add_to_queue" },
    { path: "/admin", label: "Admin Portal", icon: "admin_panel_settings" },
  ]

  if (!showNav) return <>{children}</>

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-64 bg-slate-950 border-r border-slate-800 shadow-xl z-50">
        {/* Brand */}
        <div className="p-6 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>shield_with_heart</span>
            </div>
            <div>
              <div className="text-xl font-bold text-white leading-none" style={{ fontFamily: "Manrope, sans-serif" }}>CityServe</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">Device Compliance</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path
            return (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 text-left ${
                  isActive
                    ? "bg-orange-600/10 text-orange-500 border-r-4 border-orange-600"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                <span className="material-symbols-outlined text-xl">{link.icon}</span>
                {link.label}
              </button>
            )
          })}
        </nav>

        {/* User + Status */}
        <div className="p-6 border-t border-slate-800 space-y-4">
          <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
            <p className="text-xs text-slate-400 mb-2">System Status</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-sm font-medium text-slate-200">Operational</span>
            </div>
          </div>
          {username && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white text-xs font-bold">
                {username.slice(0, 2).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">{username}</p>
                <p className="text-xs text-slate-500 truncate capitalize">{role}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Top Nav */}
      <header className="fixed top-0 right-0 left-0 md:left-64 h-16 flex justify-between items-center px-6 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 shadow-lg">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-black text-orange-600 md:hidden" style={{ fontFamily: "Manrope, sans-serif" }}>CityServe</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="relative p-1 text-slate-400 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: notifOpen ? "'FILL' 1" : "'FILL' 0" }}>notifications</span>
              {pendingDevices.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pendingDevices.length > 9 ? "9+" : pendingDevices.length}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-10 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Pending Devices</span>
                  <span className="text-xs text-slate-400">{pendingDevices.length} need attention</span>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {pendingDevices.length === 0 ? (
                    <div className="px-4 py-6 text-center text-slate-500 text-sm">All caught up!</div>
                  ) : (
                    pendingDevices.map((d) => (
                      <button
                        key={d.device_id}
                        onClick={() => { navigate(`/device/${d.device_id}`); setNotifOpen(false) }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors text-left border-b border-slate-800/50 last:border-0"
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${d.status === "intake" ? "bg-yellow-400" : "bg-blue-400"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-200 truncate">{d.chassis_serial}</p>
                          <p className="text-xs text-slate-500">{DEVICE_TYPE_LABELS[d.device_type] || d.device_type}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${d.status === "intake" ? "bg-yellow-400/10 text-yellow-400" : "bg-blue-400/10 text-blue-400"}`}>
                          {d.status === "intake" ? "New" : "In Progress"}
                        </span>
                      </button>
                    ))
                  )}
                </div>
                {pendingDevices.length > 0 && (
                  <div className="px-4 py-3 border-t border-slate-800">
                    <button
                      onClick={() => { navigate("/"); setNotifOpen(false) }}
                      className="text-xs text-orange-500 hover:text-orange-400 font-semibold"
                    >
                      View all on Dashboard →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="bg-orange-600 text-white px-4 py-2 text-sm font-bold rounded hover:bg-orange-700 transition-colors active:scale-95"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="md:ml-64 pt-16 min-h-screen">
        <div className="p-6 lg:p-10">
          {children}
        </div>
      </main>

      {/* FAB */}
      <button
        onClick={() => navigate("/intake")}
        className="fixed bottom-8 right-8 w-14 h-14 bg-orange-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-orange-700 transition-all hover:scale-110 active:scale-95 z-50 group"
      >
        <span className="material-symbols-outlined text-2xl">add</span>
        <span className="absolute right-full mr-4 bg-slate-900 text-white text-xs font-bold py-2 px-3 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          New Device
        </span>
      </button>
    </div>
  )
}
