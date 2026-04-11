import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { FiShield, FiAlertTriangle, FiFileText, FiCheck, FiWifi, FiLoader, FiCheckCircle } from "react-icons/fi"
import { api } from "../api/client"
import Layout from "../components/Layout"

interface InputField {
  name: string
  label: string
  type: "text" | "number" | "select"
  options?: string[]
  required: boolean
}

type WipeSimPhase = "idle" | "connecting" | "reading" | "complete"

interface Step {
  id: string
  instruction: string
  requires_confirmation: boolean
  input_fields: InputField[] | null
  wipe_api_sim?: boolean
}

interface CompletedStep {
  step_id: string
  confirmed: boolean
  notes: string
  timestamp: string
}

interface Device {
  device_id: string
  chassis_serial: string
  chassis_serial: string
  device_type: string
  chassis_make_model: string
  status: string
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
  const [stepInputs, setStepInputs] = useState<Record<string, Record<string, string>>>({})
  const [wipeSimPhase, setWipeSimPhase] = useState<WipeSimPhase>("idle")

  useEffect(() => { loadDevice() }, [id])

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
    } catch {
      setError("Failed to load device details")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (stepId: string, fieldName: string, value: string) => {
    setStepInputs((prev) => ({
      ...prev,
      [stepId]: { ...(prev[stepId] || {}), [fieldName]: value },
    }))
  }

  const handleStepComplete = async (step: Step) => {
    if (!id || !device) return

    // Validate required input fields
    if (step.input_fields) {
      for (const field of step.input_fields) {
        if (field.required && !stepInputs[step.id]?.[field.name]?.trim()) {
          setError(`Please fill in "${field.label}" before confirming.`)
          return
        }
      }
    }
    setError("")

    try {
      await api.patch(`/api/devices/${id}/step`, {
        step_id: step.id,
        confirmed: true,
        notes: "",
        input_data: stepInputs[step.id] || {},
      })
      await loadDevice()
    } catch (err) {
      console.error("Failed to complete step:", err)
      setError("Failed to confirm step. Please try again.")
    }
  }

  const startWipeSim = (step: Step) => {
    setWipeSimPhase("connecting")
    setTimeout(() => {
      setWipeSimPhase("reading")
      setTimeout(() => {
        setWipeSimPhase("complete")
        setTimeout(() => {
          handleStepComplete({ ...step, input_fields: null, wipe_api_sim: false })
          setWipeSimPhase("idle")
        }, 1500)
      }, 2000)
    }, 2000)
  }

  const handleComplete = async () => {
    if (!id) return
    try {
      setCompleting(true)
      await api.post(`/api/devices/${id}/complete`)
      await api.post(`/api/devices/${id}/complete`)
      navigate(`/compliance/${id}`)
    } catch {
      setError("Failed to complete device destruction")
      setCompleting(false)
    }
  }

  if (loading) {
    return <Layout><div className="text-center py-12 text-slate-400">Loading device...</div></Layout>
  }

  if (!device) {
    return (
      <Layout>
        <div className="text-center py-12 text-red-400">Device not found</div>
      </Layout>
    )
  }

  const completedSteps = device.steps_completed?.length || 0
  const totalSteps = procedures.length || 1
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
  const allDone = completedSteps >= totalSteps && totalSteps > 0

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Guided Destruction: {device.device_type}
            </h2>
            <p className="text-gray-600 flex items-center gap-2">
              <FiShield className="text-blue-600" size={16} />
              Compliance Standard: NIST 800-88 Rev. 2
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
                    className={i < completedSteps ? "flex-1 bg-blue-600" : "flex-1 bg-gray-300"}
                  />
                ))
              ) : (
                <div className="flex-1 bg-gray-300" />
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-slate-900/80 backdrop-blur-md px-0 py-4 mb-8 rounded-lg border border-slate-800 px-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Current Progress</span>
            <span className="text-xs font-bold text-orange-500">{progress}% Complete</span>
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-orange-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <FiAlertTriangle className="mt-0.5 shrink-0" size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Steps Column */}
          <div className="lg:col-span-2 space-y-6">
            {procedures.map((step, index) => {
              const isCompleted = device?.steps_completed?.some(
                (cs) => cs.step_id === step.id
              ) ?? false
              const isCurrentStep = index === completedSteps

              return (
                <div
                  key={step.id}
                  className={`bg-white rounded-lg p-6 border-l-4 transition ${
                    isCompleted
                      ? "bg-green-900/50 text-green-400 ring-0"
                      : isCurrentStep
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shrink-0 ${
                          isCompleted ? "bg-green-600" : "bg-blue-600"
                        }`}
                      >
                        {isCompleted ? <FiCheck size={16} /> : index + 1}
                      </div>
                      <h3 className="font-bold text-lg text-gray-900">
                        {step.instruction}
                      </h3>
                    </div>
                    {isCompleted && (
                      <span className="text-green-600 text-sm font-bold shrink-0 ml-4">
                        Completed
                      </span>
                    )}
                  </div>

                  {!isCompleted && isCurrentStep && (
                    <div className="space-y-4 px-12">
                      {/* Input fields (drive details, tool info, etc.) */}
                      {step.input_fields && step.input_fields.length > 0 && (
                        <div className="space-y-3 pt-2">
                          {step.input_fields.map((field) => (
                            <div key={field.name}>
                              <label className="block text-xs font-bold text-gray-700 mb-1">
                                {field.label}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              {field.type === "select" ? (
                                <select
                                  value={stepInputs[step.id]?.[field.name] || ""}
                                  onChange={(e) => handleInputChange(step.id, field.name, e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">Select...</option>
                                  {field.options?.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type={field.type}
                                  value={stepInputs[step.id]?.[field.name] || ""}
                                  onChange={(e) => handleInputChange(step.id, field.name, e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder={field.label}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Wipe API simulation */}
                      {step.wipe_api_sim ? (
                        <div className="pt-4">
                          {wipeSimPhase === "idle" && (
                            <button
                              onClick={() => startWipeSim(step)}
                              className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                            >
                              <FiWifi size={16} />
                              Connect to Wiper API
                            </button>
                          )}
                          {wipeSimPhase === "connecting" && (
                            <div className="w-full py-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center gap-3 text-blue-700">
                              <FiLoader size={16} className="animate-spin" />
                              <span className="text-sm font-bold">Connecting to device wiper API...</span>
                            </div>
                          )}
                          {wipeSimPhase === "reading" && (
                            <div className="w-full py-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center gap-3 text-blue-700">
                              <FiLoader size={16} className="animate-spin" />
                              <span className="text-sm font-bold">Reading sanitization status...</span>
                            </div>
                          )}
                          {wipeSimPhase === "complete" && (
                            <div className="w-full py-3 bg-green-50 border border-green-300 rounded-lg flex items-center justify-center gap-3 text-green-700">
                              <FiCheckCircle size={18} />
                              <span className="text-sm font-bold">Wipe confirmed — PASS</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between pt-4">
                          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded flex items-center gap-2">
                            <FiAlertTriangle size={14} />
                            Verify details before confirming
                          </p>
                          <button
                            onClick={() => handleStepComplete(step)}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition"
                          >
                            Confirm Step
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
                  <span className="text-xs text-gray-600">Make / Model</span>
                  <span className="text-sm font-bold">{device.make_model}</span>
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
                <FiFileText size={18} />
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