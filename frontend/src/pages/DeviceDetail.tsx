import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { api } from "../api/client"
import Layout from "../components/Layout"

interface Step {
  id: string
  instruction: string
  requires_confirmation: boolean
}

interface CompletedStep {
  step_id: string
  confirmed: boolean
  notes: string
  timestamp: string
}

interface Device {
  device_id: string
  serial_number: string
  device_type: string
  make_model: string
  status: string
  worker_id: string
  procedure_id: string
  steps_completed: CompletedStep[]
}

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [device, setDevice] = useState<Device | null>(null)
  const [procedures, setProcedures] = useState<Step[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadDevice()
  }, [id])

  const loadDevice = async () => {
    if (!id) return
    try {
      setLoading(true)
      const deviceRes = await api.get(`/api/devices/${id}`)
      const deviceData = deviceRes.data as Device
      setDevice(deviceData)

      if (deviceData.procedure_id) {
        const procRes = await api.get(`/api/procedures/${deviceData.procedure_id}`)
        setProcedures(procRes.data.steps || [])
      }
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

  const completedSteps = device.steps_completed?.length || 0
  const totalSteps = procedures.length || 1
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

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
              {procedures.length > 0 ? (
                procedures.map((_, i) => (
                  <div
                    key={i}
                    className={
                      i < completedSteps ? "flex-1 bg-blue-600" : "flex-1 bg-gray-300"
                    }
                  />
                ))
              ) : (
                <div className="flex-1 bg-gray-300" />
              )}
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
            {procedures.map((step, index) => {
              const isCompleted =
                device?.steps_completed?.some((cs) => cs.step_id === step.id) ??
                false
              const isCurrentStep = index === completedSteps
              return (
                <div
                  key={step.id}
                  className={`bg-white rounded-lg p-6 border-l-4 transition ${
                    isCompleted
                      ? "border-green-500"
                      : isCurrentStep
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                          isCompleted ? "bg-green-600" : "bg-blue-600"
                        }`}
                      >
                        {isCompleted ? "✓" : index + 1}
                      </div>
                      <h3 className="font-bold text-lg text-gray-900">
                        {step.instruction}
                      </h3>
                    </div>
                    {isCompleted && (
                      <span className="text-green-600 text-sm font-bold">
                        Completed
                      </span>
                    )}
                  </div>

                  {!isCompleted && isCurrentStep && (
                    <div className="space-y-4 px-12">
                      <div className="flex items-center justify-between pt-4">
                        <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded">
                          ⚠️ Verify details before confirming
                        </p>
                        <button
                          onClick={() => handleStepComplete(step.id)}
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition"
                        >
                          Confirm Step
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
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
