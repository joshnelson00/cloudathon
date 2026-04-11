import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { FiAlertCircle, FiArrowRight, FiCpu } from "react-icons/fi"
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
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FiCpu className="text-blue-600" size={28} />
            <h1 className="text-3xl font-bold text-gray-900">Device Intake</h1>
          </div>
          <p className="text-gray-600">
            Register a new device for NIST SP 800-88 compliant destruction
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <FiAlertCircle className="text-red-600 mt-0.5 shrink-0" size={18} />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Chassis Serial Number
              </label>
              <input
                type="text"
                name="chassis_serial"
                value={formData.chassis_serial}
                onChange={handleChange}
                placeholder="e.g., SN-9920-XLT"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                The serial number on the chassis label — not the drive serial.
                The drive serial is recorded during the procedure.
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Device Type
              </label>
              <select
                name="device_type"
                value={formData.device_type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DEVICE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                This determines the NIST procedure. If unsure whether a laptop
                has SATA or NVMe, check the BIOS storage settings.
              </p>
            </div>

                {/* Make & Model */}
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

                {/* Worker ID (read-only) */}
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

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-bold transition"
              >
                {loading ? "Creating..." : (
                <span className="flex items-center justify-center gap-2">
                  Start Procedure <FiArrowRight size={18} />
                </span>
              )}
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
