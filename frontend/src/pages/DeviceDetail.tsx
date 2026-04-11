import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { api } from "../api/client"
import Layout from "../components/Layout"

interface Step {
  step_id: string
  description: string
  completed: boolean
  timestamp?: string
}

interface Device {
  device_id: string
  chassis_serial: string
  device_type: string
  chassis_make_model: string
  status: string
  worker_id: string
  steps: Step[]
}

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [device, setDevice] = useState<Device | null>(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState<Record<string, string>>({})

  useEffect(() => {
    loadDevice()
  }, [id])

  const loadDevice = async () => {
    if (!id) return
    try {
      setLoading(true)
      const response = await api.get(`/api/devices/${id}`)
      setDevice(response.data)
    } catch (err) {
      setError("Failed to load device details")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleStepComplete = async (stepId: string) => {
    if (!id || !device) return

    try {
      await api.patch(`/api/devices/${id}/step`, {
        step_id: stepId,
        confirmed: true,
        input_data: formData[stepId] ? { value: formData[stepId] } : {},
      })
      loadDevice()
    } catch (err) {
      console.error("Failed to complete step:", err)
    }
  }

  const handleComplete = async () => {
    if (!id) return

    try {
      setCompleting(true)
      const response = await api.post(`/api/devices/${id}/complete`)
      navigate(`/compliance/${id}`)
    } catch (err) {
      setError("Failed to complete device destruction")
      console.error(err)
    } finally {
      setCompleting(false)
    }
  }

  if (loading) {
    return <Layout><div className="text-center py-12">Loading device...</div></Layout>
  }

  if (!device) {
    return (
      <Layout>
        <div className="text-center py-12 text-red-600">Device not found</div>
      </Layout>
    )
  }

  const completedSteps = device.steps?.filter((s) => s.completed).length || 0
  const totalSteps = device.steps?.length || 1
  const progress = Math.round((completedSteps / totalSteps) * 100)

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Guided Destruction: {device.device_type}
            </h2>
            <p className="text-gray-600 flex items-center gap-2">
              🔒 Compliance Standard: NIST 800-88 Rev. 1
            </p>
          </div>
          <div className="w-full md:w-80">
            <div className="flex justify-between text-xs font-bold text-gray-600 mb-2">
              <span>Sanitization Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="flex gap-1 h-3 bg-gray-200 rounded overflow-hidden">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={
                    i < completedSteps ? "flex-1 bg-blue-600" : "flex-1 bg-gray-300"
                  }
                />
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Steps Column */}
          <div className="lg:col-span-2 space-y-6">
            {device.steps?.map((step, index) => (
              <div
                key={step.step_id}
                className={`bg-white rounded-lg p-6 border-l-4 transition ${
                  step.completed
                    ? "border-green-500"
                    : index === completedSteps
                    ? "border-blue-500 ring-2 ring-blue-200"
                    : "border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                        step.completed ? "bg-green-600" : "bg-blue-600"
                      }`}
                    >
                      {step.completed ? "✓" : index + 1}
                    </div>
                    <h3 className="font-bold text-lg text-gray-900">
                      {step.description}
                    </h3>
                  </div>
                  {step.completed && (
                    <span className="text-green-600 text-sm font-bold">
                      Completed
                    </span>
                  )}
                </div>

                {!step.completed && index === completedSteps && (
                  <div className="space-y-4 px-12">
                    {step.step_id === "drive_details" && (
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Drive Serial"
                          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              [step.step_id]: e.target.value,
                            })
                          }
                        />
                        <input
                          type="text"
                          placeholder="Manufacturer"
                          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4">
                      <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded">
                        ⚠️ Verify details before confirming
                      </p>
                      <button
                        onClick={() => handleStepComplete(step.step_id)}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition"
                      >
                        Confirm Step
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Device Info */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h4 className="text-xs font-bold uppercase text-blue-600 tracking-wider mb-4">
                Device Overview
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-xs text-gray-600">Serial</span>
                  <span className="text-sm font-bold font-mono">
                    {device.chassis_serial}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-xs text-gray-600">Make/Model</span>
                  <span className="text-sm font-bold">
                    {device.chassis_make_model}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-xs text-gray-600">Type</span>
                  <span className="text-sm font-bold">{device.device_type}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-xs text-gray-600">Status</span>
                  <span className="text-sm font-bold text-blue-600">
                    {device.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Complete Button */}
            <div className="bg-blue-600 text-white p-6 rounded-lg">
              <h4 className="text-xs font-bold uppercase mb-3 text-blue-100">
                Final Action
              </h4>
              <p className="text-sm mb-4">
                Ensure all steps are complete before generating the compliance
                certificate.
              </p>
              <button
                onClick={handleComplete}
                disabled={completedSteps < totalSteps || completing}
                className={`w-full py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition ${
                  completedSteps < totalSteps
                    ? "bg-white/30 text-white/50 cursor-not-allowed"
                    : "bg-white text-blue-600 hover:bg-blue-50"
                }`}
              >
                <span>📄</span>
                {completing ? "Generating..." : "Generate Certificate"}
              </button>
              {completedSteps < totalSteps && (
                <p className="text-xs text-center mt-2 text-blue-100">
                  Complete all {totalSteps} steps first ({completedSteps}/{totalSteps})
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
