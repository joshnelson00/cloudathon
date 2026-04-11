import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Layout from "../components/Layout"

const OPERATING_SYSTEMS = [
  { value: "windows",        label: "Windows" },
  { value: "linux",          label: "Linux" },
  { value: "macos_apple",    label: "macOS — Apple Silicon (M1/M2/M3/M4)" },
  { value: "macos_intel",    label: "macOS — Intel" },
]

const DEVICE_CATEGORIES = [
  { value: "laptop",    label: "Laptop" },
  { value: "desktop",   label: "Desktop" },
  { value: "tablet",    label: "Tablet / Mobile Device" },
  { value: "external",  label: "External Drive" },
  { value: "other",     label: "Other / Custom Device" },
]

export default function DeviceIntake() {
  const [formData, setFormData] = useState({
    chassis_serial: "",
    make_model: "",
    os: "windows",
    device_category: "laptop",
  })
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!formData.chassis_serial.trim()) {
      setError("Chassis serial number is required.")
      return
    }
    if (!formData.make_model.trim()) {
      setError("Make & model is required.")
      return
    }
    navigate("/identify-drive", { state: formData })
  }

  const username = localStorage.getItem("username") || "dwight_ferris"

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center text-sm font-bold">1</div>
              <span className="text-sm font-semibold text-white">Device Details</span>
            </div>
            <div className="flex-1 h-px bg-slate-700 max-w-16"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-400 flex items-center justify-center text-sm font-bold">2</div>
              <span className="text-sm font-semibold text-slate-500">Identify Drive</span>
            </div>
            <div className="flex-1 h-px bg-slate-700 max-w-16"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-400 flex items-center justify-center text-sm font-bold">3</div>
              <span className="text-sm font-semibold text-slate-500">Wipe Procedure</span>
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Enter Device Details</h1>
          <p className="text-slate-400 max-w-2xl leading-relaxed">
            Enter the basic device information. On the next step you'll identify the drive type so the correct NIST sanitization procedure can be assigned.
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

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Device Category</label>
                  <select
                    name="device_category"
                    value={formData.device_category}
                    onChange={handleChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all"
                  >
                    {DEVICE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">General device category — the exact drive type is confirmed on the next step.</p>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Operating System</label>
                  <select
                    name="os"
                    value={formData.os}
                    onChange={handleChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all"
                  >
                    {OPERATING_SYSTEMS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Used to provide OS-specific instructions for identifying the drive type in BIOS/System Report.</p>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="submit"
                  className="px-10 py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg shadow-lg shadow-orange-600/20 flex items-center gap-3 transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_forward</span>
                  Next: Identify Drive
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
                  <h3 className="font-bold text-white mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>Why identify the drive first?</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    NIST SP 800-88 Rev. 2 requires the sanitization method to match the physical storage type. Guessing wrong can invalidate the compliance certificate.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-slate-800 border border-slate-700 rounded-lg">
                  <span className="material-symbols-outlined text-slate-400">memory</span>
                  <div className="text-xs">
                    <span className="font-bold text-slate-200 block">SSD / NVMe / SATA Flash</span>
                    <span className="text-slate-400">NIST 800-88 Purge / Cryptographic Erase</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-800 border border-slate-700 rounded-lg">
                  <span className="material-symbols-outlined text-slate-400">hard_drive</span>
                  <div className="text-xs">
                    <span className="font-bold text-slate-200 block">HDD / Magnetic Spinning Disk</span>
                    <span className="text-slate-400">NIST 800-88 Clear / 3-Pass Overwrite</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-800 border border-slate-700 rounded-lg">
                  <span className="material-symbols-outlined text-slate-400">phonelink_erase</span>
                  <div className="text-xs">
                    <span className="font-bold text-slate-200 block">Tablet / No Storage</span>
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