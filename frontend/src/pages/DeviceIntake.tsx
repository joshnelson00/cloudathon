import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../api/client"
import Layout from "../components/Layout"

const DEVICE_TYPES = [
  { value: "laptop_hdd", label: "Laptop - HDD" },
  { value: "laptop_ssd", label: "Laptop - SSD" },
  { value: "tablet", label: "Tablet / Mobile" },
  { value: "drive_external_hdd", label: "External Drive - HDD" },
  { value: "drive_external_ssd", label: "External Drive - SSD" },
  { value: "no_storage", label: "Device with No Storage" },
]

export default function DeviceIntake() {
  const [formData, setFormData] = useState({
    chassis_serial: "",
    device_type: "laptop_hdd",
    chassis_make_model: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await api.post("/api/devices", formData)
      navigate(`/device/${response.data.device_id}`)
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          "Failed to create device. Please try again."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Device Intake
          </h1>
          <p className="text-gray-600">
            Register a new device for NIST SP 800-88 compliant destruction
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
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
                The unique identifier on the device chassis
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
                This determines the NIST procedure to follow
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Make / Model
              </label>
              <input
                type="text"
                name="chassis_make_model"
                value={formData.chassis_make_model}
                onChange={handleChange}
                placeholder="e.g., Dell Latitude 5400"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Manufacturer and model number
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Next Step:</strong> After intake, you'll record drive
                details and follow the NIST-compliant destruction procedure for
                this device type.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-bold transition"
              >
                {loading ? "Creating..." : "Create Device Record"}
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
