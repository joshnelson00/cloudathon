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
    } catch {
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
        <div className="py-6 mb-6 border-b border-slate-800">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
                {device.chassis_make_model} — {device.device_type.replace(/_/g, " ")} Purge Procedure
              </h1>
              <p className="text-slate-400 mt-2 flex items-center gap-4 text-sm">
                <span className="bg-slate-800 px-2 py-0.5 rounded font-mono text-xs">Device ID: {device.device_id.slice(0, 8)}...</span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">person</span>
                  {localStorage.getItem("username") || "Worker"}
                </span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-orange-500 uppercase tracking-widest">
                Step {completedSteps} of {totalSteps}
              </span>
              <p className="text-slate-400 text-xs mt-1">Compliance Level: NIST 800-88</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="py-4 mb-8 rounded-lg border border-slate-800 bg-slate-900/80 px-6">
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
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>
        )}

        {/* Steps */}
        <div className="space-y-6">
          {procedures.map((step, index) => {
            const isCompleted = device.steps_completed?.some((cs) => cs.step_id === step.id) ?? false
            const isCurrentStep = index === completedSteps

            return (
              <div key={step.id} className="relative flex gap-6">
                {/* Timeline dot */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCompleted
                      ? "bg-green-900/50 text-green-400"
                      : isCurrentStep
                      ? "bg-orange-600 text-white ring-4 ring-orange-500/20"
                      : "bg-slate-800 text-slate-500"
                  }`}>
                    {isCompleted ? (
                      <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    ) : isCurrentStep ? (
                      <span className="material-symbols-outlined text-lg">edit_note</span>
                    ) : (
                      <span className="font-bold text-sm">{index + 1}</span>
                    )}
                  </div>
                  {index < procedures.length - 1 && (
                    <div className={`w-0.5 flex-1 my-2 ${isCompleted ? "bg-green-800" : "bg-slate-800"}`} />
                  )}
                </div>

                {/* Card */}
                <div className={`flex-1 pb-6 ${!isCompleted && !isCurrentStep ? "opacity-40" : ""}`}>
                  {isCurrentStep && !isCompleted ? (
                    <div className="bg-slate-900 border-l-4 border-orange-600 border border-orange-600/20 p-8 rounded-xl shadow-xl shadow-orange-900/10">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <span className="bg-orange-900/40 text-orange-400 text-[10px] font-black uppercase px-2 py-0.5 rounded">Current Step</span>
                          <h3 className="text-xl font-bold text-white mt-2" style={{ fontFamily: "Manrope, sans-serif" }}>{step.instruction}</h3>
                          <p className="text-slate-400 text-sm mt-1">Verify and confirm this step before proceeding.</p>
                        </div>
                        <span className="material-symbols-outlined text-slate-600 text-4xl">storage</span>
                      </div>

                      {/* Input fields */}
                      {step.input_fields && step.input_fields.length > 0 && (
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          {step.input_fields.map((field) => (
                            <div key={field.name}>
                              <label className="text-xs font-bold text-slate-300 uppercase tracking-wide block mb-1">
                                {field.label}{field.required && <span className="text-red-400 ml-1">*</span>}
                              </label>
                              {field.type === "select" ? (
                                <select
                                  value={stepInputs[step.id]?.[field.name] || ""}
                                  onChange={(e) => handleInputChange(step.id, field.name, e.target.value)}
                                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 outline-none"
                                >
                                  <option value="">Select...</option>
                                  {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                              ) : (
                                <input
                                  type={field.type}
                                  value={stepInputs[step.id]?.[field.name] || ""}
                                  onChange={(e) => handleInputChange(step.id, field.name, e.target.value)}
                                  placeholder={field.label}
                                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:ring-2 focus:ring-orange-600 outline-none"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Wipe simulation or confirm */}
                      {step.wipe_api_sim ? (
                        <div>
                          {wipeSimPhase === "idle" && (
                            <button
                              onClick={() => startWipeSim(step)}
                              className="w-full py-4 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition flex items-center justify-center gap-2"
                            >
                              <span className="material-symbols-outlined">wifi</span>
                              Connect to Wiper API
                            </button>
                          )}
                          {wipeSimPhase === "connecting" && (
                            <div className="w-full py-4 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center gap-3 text-slate-300">
                              <span className="material-symbols-outlined animate-spin">sync</span>
                              <span className="text-sm font-bold">Connecting to device wiper API...</span>
                            </div>
                          )}
                          {wipeSimPhase === "reading" && (
                            <div className="w-full py-4 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center gap-3 text-slate-300">
                              <span className="material-symbols-outlined animate-spin">sync</span>
                              <span className="text-sm font-bold">Reading sanitization status...</span>
                            </div>
                          )}
                          {wipeSimPhase === "complete" && (
                            <div className="w-full py-4 bg-emerald-900/40 border border-emerald-700 rounded-xl flex items-center justify-center gap-3 text-emerald-400">
                              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                              <span className="text-sm font-bold">Wipe confirmed — PASS</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStepComplete(step)}
                          className="w-full bg-orange-600 text-white font-bold py-4 rounded-xl hover:bg-orange-700 transition-all flex items-center justify-center gap-2 text-lg shadow-lg shadow-orange-600/20 active:scale-[0.98]"
                        >
                          Confirm Step
                          <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className={`p-5 rounded-xl border ${
                      isCompleted ? "bg-green-950/30 border-green-800/50" : "bg-slate-900 border-slate-800"
                    }`}>
                      <h3 className={`text-lg font-bold ${isCompleted ? "text-slate-300" : "text-slate-500"}`} style={{ fontFamily: "Manrope, sans-serif" }}>
                        {step.instruction}
                      </h3>
                      {isCompleted && (
                        <p className="text-green-400 text-xs font-bold mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          Completed
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="mt-10 py-10 text-center border-t border-slate-800">
          <button
            onClick={handleComplete}
            disabled={!allDone || completing}
            className={`px-10 py-4 font-bold rounded-xl flex items-center gap-3 mx-auto text-lg transition-all ${
              allDone
                ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
          >
            <span className="material-symbols-outlined">assignment_turned_in</span>
            {completing ? "Generating..." : "Mark Device Complete"}
          </button>
          {!allDone && (
            <p className="text-slate-500 text-sm mt-4 italic">
              Complete all {totalSteps} steps to enable final certification. ({completedSteps}/{totalSteps} done)
            </p>
          )}
        </div>
      </div>
    </Layout>
  )
}