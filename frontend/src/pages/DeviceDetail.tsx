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
  hint?: string
}

type WipeSimPhase = "idle" | "connecting" | "reading" | "complete"
type PrefillPhase = "idle" | "connecting" | "reading" | "complete"

interface Step {
  id: string
  instruction: string
  requires_confirmation: boolean
  input_fields: InputField[] | null
  wipe_api_sim?: boolean
  wipe_api_prefill?: boolean
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
  make_model: string
  status: string
  procedure_id: string
  steps_completed: CompletedStep[]
  comp_doc?: string | null
}

// ── Mock wipe tool API response ───────────────────────────────────────────────

function getMockApiData(deviceType: string): Record<string, string> {
  const rand = () => Math.random().toString(36).substring(2, 8).toUpperCase()
  const drives: Record<string, { manufacturer: string; model: string; serial: string; capacity: string }> = {
    laptop_ssd_nvme:    { manufacturer: "Samsung",        model: "MZVLB512HAJQ-000H1", serial: "S3EVNX0K" + rand(), capacity: "512"  },
    laptop_ssd_sata:    { manufacturer: "Crucial",        model: "CT500MX500SSD1",     serial: "2142E" + rand(),    capacity: "500"  },
    laptop_hdd:         { manufacturer: "Seagate",        model: "ST1000LM035-1RK172", serial: "WCT3" + rand(),     capacity: "1000" },
    laptop_ssd:         { manufacturer: "Samsung",        model: "860 EVO 500GB",      serial: "S4EUNX0K" + rand(), capacity: "500"  },
    desktop_hdd:        { manufacturer: "Western Digital",model: "WD10EZEX-08WN4A0",   serial: "WD-WCC" + rand(),   capacity: "1000" },
    desktop_ssd:        { manufacturer: "Samsung",        model: "870 EVO 500GB",      serial: "S5EVNF0R" + rand(), capacity: "500"  },
    drive_external_hdd: { manufacturer: "Western Digital",model: "WD Elements 2TB",    serial: "WXL1" + rand(),     capacity: "2000" },
    drive_external_ssd: { manufacturer: "Samsung",        model: "T7 Portable 1TB",    serial: "S5EVNF0R" + rand(), capacity: "1000" },
    drive_external:     { manufacturer: "Seagate",        model: "Backup Plus 2TB",    serial: "NA" + rand(),       capacity: "2000" },
  }
  const drive = drives[deviceType] ?? { manufacturer: "Unknown", model: "Unknown", serial: "UNKNOWN001", capacity: "0" }
  return {
    drive_serial:       drive.serial,
    drive_manufacturer: drive.manufacturer,
    drive_model:        drive.model,
    drive_capacity_gb:  drive.capacity,
    wipe_tool_name:     "nwipe",
    wipe_tool_version:  "0.36",
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

const FAILURE_VALUES = ["fail", "drive_failed"]

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
  const [failureAcknowledged, setFailureAcknowledged] = useState<Record<string, boolean>>({})
  const [prefillPhase, setPrefillPhase] = useState<PrefillPhase>("idle")
  const [apiData, setApiData] = useState<Record<string, string> | null>(null)
  const [autofilledSteps, setAutofilledSteps] = useState<Set<string>>(new Set())

  useEffect(() => { loadDevice(true) }, [id])

  const loadDevice = async (showLoader = false) => {
    if (!id) return
    try {
      if (showLoader) setLoading(true)
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

  const getStepFailure = (stepId: string, fields: InputField[] | null): string | null => {
    if (!fields) return null
    for (const field of fields) {
      const value = stepInputs[stepId]?.[field.name]
      if (value && FAILURE_VALUES.includes(value.toLowerCase())) return field.label
    }
    return null
  }

  const handleInputChange = (stepId: string, fieldName: string, value: string) => {
    setStepInputs((prev) => ({
      ...prev,
      [stepId]: { ...(prev[stepId] || {}), [fieldName]: value },
    }))
    if (failureAcknowledged[stepId]) {
      setFailureAcknowledged((prev) => ({ ...prev, [stepId]: false }))
    }
  }

  const handleStepComplete = async (step: Step) => {
    if (!id || !device) return
    if (step.input_fields) {
      for (const field of step.input_fields) {
        if (field.required && !stepInputs[step.id]?.[field.name]?.trim()) {
          setError(`Please fill in "${field.label}" before confirming.`)
          return
        }
      }
    }
    const failureField = getStepFailure(step.id, step.input_fields)
    if (failureField && !failureAcknowledged[step.id]) return

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

  const startPrefill = (step: Step) => {
    setPrefillPhase("connecting")
    setTimeout(() => {
      setPrefillPhase("reading")
      setTimeout(() => {
        const mock = getMockApiData(device?.device_type || "")
        setApiData(mock)
        const relevant: Record<string, string> = {}
        for (const field of step.input_fields || []) {
          if (mock[field.name] !== undefined) relevant[field.name] = mock[field.name]
        }
        setStepInputs((prev) => ({ ...prev, [step.id]: { ...(prev[step.id] || {}), ...relevant } }))
        setAutofilledSteps((prev) => new Set(prev).add(step.id))
        setPrefillPhase("complete")
        setTimeout(() => setPrefillPhase("idle"), 800)
      }, 2000)
    }, 1500)
  }

  const quickPrefill = (step: Step, data: Record<string, string>) => {
    const relevant: Record<string, string> = {}
    for (const field of step.input_fields || []) {
      if (data[field.name] !== undefined) relevant[field.name] = data[field.name]
    }
    setStepInputs((prev) => ({ ...prev, [step.id]: { ...(prev[step.id] || {}), ...relevant } }))
    setAutofilledSteps((prev) => new Set(prev).add(step.id))
  }

  const handleComplete = async () => {
    if (!id || completing) return
    try {
      setCompleting(true)
      await api.post(`/api/devices/${id}/complete`)
      await loadDevice()
    } catch {
      setError("Failed to complete device destruction")
    } finally {
      setCompleting(false)
    }
  }

  const completedSteps = device?.steps_completed?.length || 0
  const totalSteps = procedures.length || 1
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
  const allDone = completedSteps >= totalSteps && totalSteps > 0
  const isDocumented = device?.status === "documented"
  const canViewCompliance = isDocumented && Boolean(device?.comp_doc)

  useEffect(() => {
    if (allDone && !isDocumented && !completing && procedures.length > 0 && device) {
      handleComplete()
    }
  }, [allDone, isDocumented])

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

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="py-6 mb-6 border-b border-slate-800">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
                {device.make_model} — {device.device_type.replace(/_/g, " ")} Purge Procedure
              </h1>
              <p className="text-slate-400 mt-2 flex items-center gap-4 text-sm">
                <span className="bg-slate-800 px-2 py-0.5 rounded font-mono text-xs">Device ID: {device.device_id.slice(0, 8)}...</span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">person</span>
                  {localStorage.getItem("username") || "dwight_ferris"}
                </span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-orange-500 uppercase tracking-widest">
                Step {Math.min(completedSteps, totalSteps)} of {totalSteps}
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
        {!isDocumented && (
          <div className="space-y-6">
            {procedures.map((step, index) => {
            const isCompleted = device.steps_completed?.some((cs) => cs.step_id === step.id) ?? false
            const isCurrentStep = index === completedSteps
            const stepFailure = isCurrentStep ? getStepFailure(step.id, step.input_fields) : null
            const hasFailure = !!stepFailure
            const acknowledged = failureAcknowledged[step.id] ?? false
            const wasAutofilled = autofilledSteps.has(step.id)

            return (
              <div key={step.id} className="relative flex gap-6">
                {/* Timeline dot */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCompleted
                      ? "bg-green-900/50 text-green-400"
                      : isCurrentStep && hasFailure
                      ? "bg-red-600 text-white ring-4 ring-red-500/20"
                      : isCurrentStep
                      ? "bg-orange-600 text-white ring-4 ring-orange-500/20"
                      : "bg-slate-800 text-slate-500"
                  }`}>
                    {isCompleted ? (
                      <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    ) : isCurrentStep && hasFailure ? (
                      <span className="material-symbols-outlined text-lg">error</span>
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
                    <div className={`bg-slate-900 border-l-4 border p-8 rounded-xl shadow-xl ${
                      hasFailure
                        ? "border-red-600 border-red-600/20 shadow-red-900/10"
                        : "border-orange-600 border-orange-600/20 shadow-orange-900/10"
                    }`}>
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                            hasFailure ? "bg-red-900/40 text-red-400" : "bg-orange-900/40 text-orange-400"
                          }`}>
                            {hasFailure ? "Attention Required" : "Current Step"}
                          </span>
                          <h3 className="text-xl font-bold text-white mt-2" style={{ fontFamily: "Manrope, sans-serif" }}>{step.instruction}</h3>
                          <p className="text-slate-400 text-sm mt-1">Verify and confirm this step before proceeding.</p>
                        </div>
                        <span className="material-symbols-outlined text-slate-600 text-4xl">storage</span>
                      </div>

                      {/* Prefill section */}
                      {step.wipe_api_prefill && (
                        <div className="mb-6">
                          {apiData && prefillPhase === "idle" && !wasAutofilled && (
                            <button
                              onClick={() => quickPrefill(step, apiData)}
                              className="w-full py-3 bg-blue-900/30 border border-blue-700 text-blue-300 rounded-xl font-bold hover:bg-blue-900/50 transition flex items-center justify-center gap-2 text-sm mb-4"
                            >
                              <span className="material-symbols-outlined text-blue-400">bolt</span>
                              Auto-fill from Wipe Tool (already connected)
                            </button>
                          )}
                          {!apiData && prefillPhase === "idle" && (
                            <button
                              onClick={() => startPrefill(step)}
                              className="w-full py-3 bg-slate-800 border border-slate-600 text-slate-200 rounded-xl font-bold hover:bg-slate-700 transition flex items-center justify-center gap-2 text-sm mb-4"
                            >
                              <span className="material-symbols-outlined">wifi</span>
                              Read Drive Info from Wipe Tool
                            </button>
                          )}
                          {prefillPhase === "connecting" && (
                            <div className="w-full py-3 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center gap-3 text-slate-300 mb-4">
                              <span className="material-symbols-outlined animate-spin">sync</span>
                              <span className="text-sm font-bold">Connecting to wipe tool...</span>
                            </div>
                          )}
                          {prefillPhase === "reading" && (
                            <div className="w-full py-3 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center gap-3 text-slate-300 mb-4">
                              <span className="material-symbols-outlined animate-spin">sync</span>
                              <span className="text-sm font-bold">Reading drive metadata...</span>
                            </div>
                          )}
                          {(prefillPhase === "complete" || wasAutofilled) && (
                            <div className="w-full py-3 bg-emerald-900/30 border border-emerald-700 rounded-xl flex items-center justify-center gap-3 text-emerald-300 mb-4">
                              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                              <span className="text-sm font-bold">Drive info retrieved — fields auto-filled. Review and confirm.</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Input fields */}
                      {step.input_fields && step.input_fields.length > 0 && (
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          {step.input_fields.map((field) => {
                            const fieldValue = stepInputs[step.id]?.[field.name] || ""
                            const isFailedField = !!fieldValue && FAILURE_VALUES.includes(fieldValue.toLowerCase())
                            const isAutofilled = wasAutofilled && apiData?.[field.name] !== undefined
                            return (
                              <div key={field.name} className="col-span-1">
                                <label className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-2 mb-1">
                                  {field.label}
                                  {field.required && <span className="text-red-400">*</span>}
                                  {isAutofilled && (
                                    <span className="text-[10px] font-black bg-emerald-900/40 text-emerald-400 px-1.5 py-0.5 rounded uppercase tracking-wide">
                                      Auto-filled
                                    </span>
                                  )}
                                </label>
                                {field.type === "select" ? (
                                  <select
                                    value={fieldValue}
                                    onChange={(e) => handleInputChange(step.id, field.name, e.target.value)}
                                    className={`w-full rounded-lg px-3 py-2 text-sm outline-none ${
                                      isFailedField
                                        ? "bg-red-950 border-2 border-red-600 text-red-300 focus:ring-2 focus:ring-red-600"
                                        : "bg-slate-800 border border-slate-700 text-slate-100 focus:ring-2 focus:ring-orange-600"
                                    }`}
                                  >
                                    <option value="">Select...</option>
                                    {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                  </select>
                                ) : (
                                  <input
                                    type={field.type}
                                    value={fieldValue}
                                    onChange={(e) => handleInputChange(step.id, field.name, e.target.value)}
                                    placeholder={field.label}
                                    className={`w-full rounded-lg px-3 py-2 text-slate-100 text-sm focus:ring-2 outline-none transition-colors ${
                                      isFailedField
                                        ? "bg-red-950 border-2 border-red-600 text-red-300 focus:ring-red-600"
                                        : isAutofilled
                                        ? "bg-slate-800 border border-emerald-700/60 focus:ring-orange-600"
                                        : "bg-slate-800 border border-slate-700 focus:ring-orange-600"
                                    }`}
                                  />
                                )}
                                {field.hint && !isAutofilled && (
                                  <p className="text-xs text-slate-500 mt-1 leading-snug flex items-start gap-1">
                                    <span className="material-symbols-outlined text-slate-600 shrink-0" style={{ fontSize: "13px", marginTop: "1px" }}>info</span>
                                    {field.hint}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Failure warning */}
                      {hasFailure && !acknowledged && (
                        <div className="mb-6 p-5 bg-red-950/50 border border-red-700 rounded-xl">
                          <div className="flex items-start gap-3 mb-3">
                            <span className="material-symbols-outlined text-red-400 text-2xl flex-shrink-0 mt-0.5">warning</span>
                            <div>
                              <h4 className="font-bold text-red-300 text-sm">Sanitization Failure Detected</h4>
                              <p className="text-red-300/80 text-sm mt-1 leading-relaxed">
                                The {stepFailure} indicates a failed result. A failed sanitization means the device
                                may still contain recoverable data and does not meet NIST SP 800-88 compliance requirements.
                                The compliance certificate will reflect this failure.
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-3 mt-4">
                            <button
                              onClick={() => setFailureAcknowledged((prev) => ({ ...prev, [step.id]: true }))}
                              className="px-5 py-2.5 bg-red-700 text-white text-sm font-bold rounded-lg hover:bg-red-600 transition flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined text-base">check</span>
                              Acknowledge &amp; Continue
                            </button>
                            <button
                              onClick={() => {
                                const failedField = step.input_fields?.find(
                                  (f) => FAILURE_VALUES.includes((stepInputs[step.id]?.[f.name] || "").toLowerCase())
                                )
                                if (failedField) handleInputChange(step.id, failedField.name, "")
                              }}
                              className="px-5 py-2.5 bg-slate-700 text-slate-200 text-sm font-bold rounded-lg hover:bg-slate-600 transition"
                            >
                              Change Selection
                            </button>
                          </div>
                        </div>
                      )}

                      {hasFailure && acknowledged && (
                        <div className="mb-6 p-4 bg-amber-950/30 border border-amber-700/50 rounded-xl flex items-center gap-3">
                          <span className="material-symbols-outlined text-amber-500">info</span>
                          <p className="text-amber-300/80 text-sm">
                            Failure acknowledged. The compliance document will record the sanitization as <strong className="text-amber-300">FAIL</strong>. You may proceed.
                          </p>
                        </div>
                      )}

                      {/* Wipe simulation or confirm button */}
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
                          disabled={hasFailure && !acknowledged}
                          className={`w-full font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-lg active:scale-[0.98] ${
                            hasFailure && !acknowledged
                              ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                              : hasFailure && acknowledged
                              ? "bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-600/20"
                              : "bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-600/20"
                          }`}
                        >
                          {hasFailure && acknowledged ? "Continue Despite Failure" : "Confirm Step"}
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
        )}

        {isDocumented && (
          <div className="mb-2 rounded-xl border border-emerald-700/40 bg-emerald-900/20 p-6 text-center">
            <p className="text-emerald-300 font-semibold">
              All sanitization steps are complete. This device is fully documented.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 py-10 text-center border-t border-slate-800">
          {isDocumented ? (
            <button
              onClick={() => navigate(`/compliance/${id}`)}
              className={`px-10 py-4 font-bold rounded-xl flex items-center gap-3 mx-auto text-lg transition-all ${
                canViewCompliance
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
                  : "bg-slate-800 text-slate-400 cursor-not-allowed"
              }`}
              disabled={!canViewCompliance}
            >
              <span className="material-symbols-outlined">description</span>
              View Compliance Document
            </button>
          ) : completing ? (
            <div className="px-10 py-4 font-bold rounded-xl flex items-center gap-3 mx-auto text-lg bg-slate-800 text-slate-400 w-fit">
              <span className="material-symbols-outlined animate-spin">sync</span>
              Generating Compliance Document...
            </div>
          ) : (
            <p className="text-slate-500 text-sm italic">
              Complete all {totalSteps} steps to generate the compliance document. ({completedSteps}/{totalSteps} done)
            </p>
          )}
        </div>
      </div>
    </Layout>
  )
}