import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../api/client"
import Layout from "../components/Layout"

const DEVICE_TYPES = [
  { value: "laptop_hdd",         label: "Laptop — HDD (spinning disk)" },
  { value: "laptop_ssd_sata",    label: "Laptop — SATA SSD" },
  { value: "laptop_ssd_nvme",    label: "Laptop — NVMe SSD (M.2)" },
  { value: "desktop_hdd",        label: "Desktop — HDD (spinning disk)" },
  { value: "desktop_ssd",        label: "Desktop — SSD" },
  { value: "tablet",             label: "Tablet / Mobile Device" },
  { value: "drive_external_hdd", label: "External Drive — HDD" },
  { value: "drive_external_ssd", label: "External Drive — SSD" },
  { value: "no_storage",         label: "Device with No Storage" },
]

export default function DeviceIntake() {
  const [formData, setFormData] = useState({
    chassis_serial: "",
    device_type: "laptop_hdd",
    make_model: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const response = await api.post("/api/devices", formData)
      navigate(`/device/${response.data.device_id}`)
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create device. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const username = localStorage.getItem("username") || "—"

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Intake New Device</h1>
          <p className="text-slate-400 max-w-2xl leading-relaxed">
            Enter the donated device details below. The correct NIST sanitization procedure will be assigned automatically based on the device storage architecture.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left: Form */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Chassis Serial Number</label>
                  <input
                    type="text"
                    name="chassis_serial"
                    value={formData.chassis_serial}
                    onChange={handleChange}
                    placeholder="e.g. SN-8829-XJ-01"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-1">Serial number on the chassis label — the drive serial is recorded during the procedure.</p>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Device Type</label>
                  <select
                    name="device_type"
                    value={formData.device_type}
                    onChange={handleChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all"
                  >
                    {DEVICE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">This determines the NIST procedure. If unsure whether a laptop has SATA or NVMe, check BIOS storage settings.</p>
                </div>

                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Make &amp; Model</label>
                  <input
                    type="text"
                    name="make_model"
                    value={formData.make_model}
                    onChange={handleChange}
                    placeholder="Dell Latitude 5400"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-slate-500 mb-2">Worker ID</label>
                  <input
                    type="text"
                    value={username}
                    readOnly
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-slate-500 cursor-not-allowed font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-10 py-4 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-lg shadow-orange-600/20 flex items-center gap-3 transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>assignment_turned_in</span>
                  {loading ? "Registering..." : "Register Device"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>

          {/* Right: Info Panel */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 sticky top-24">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-blue-400">info</span>
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>NIST Assignment Engine</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Procedure will be auto-assigned based on device type and storage medium detected.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-slate-800 border border-slate-700 rounded-lg">
                  <span className="material-symbols-outlined text-slate-400">memory</span>
                  <div className="text-xs">
                    <span className="font-bold text-slate-200 block">SSD / Flash Protocol</span>
                    <span className="text-slate-400">NIST 800-88 Purge / Cryptographic Erase</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-800 border border-slate-700 rounded-lg">
                  <span className="material-symbols-outlined text-slate-400">hard_drive</span>
                  <div className="text-xs">
                    <span className="font-bold text-slate-200 block">HDD / Magnetic Protocol</span>
                    <span className="text-slate-400">NIST 800-88 Clear / 3-Pass Overwrite</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-800 border border-slate-700 rounded-lg">
                  <span className="material-symbols-outlined text-slate-400">phonelink_erase</span>
                  <div className="text-xs">
                    <span className="font-bold text-slate-200 block">Tablet / No Storage Protocol</span>
                    <span className="text-slate-400">NIST 800-88 Clear / Factory Reset</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-xs text-slate-400 font-medium">Compliance Engine Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
