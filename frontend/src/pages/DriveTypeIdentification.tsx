import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { api } from "../api/client"
import Layout from "../components/Layout"

// ── Drive type options per device category ────────────────────────────────────

const DRIVE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  laptop: [
    { value: "laptop_ssd_nvme", label: "NVMe SSD (M.2 slot, very fast)" },
    { value: "laptop_ssd_sata", label: "SATA SSD (2.5\" or M.2 SATA)" },
    { value: "laptop_hdd",      label: "HDD — Spinning Disk (2.5\")" },
  ],
  desktop: [
    { value: "desktop_ssd",     label: "SSD (SATA or NVMe)" },
    { value: "desktop_hdd",     label: "HDD — Spinning Disk (3.5\")" },
  ],
  tablet: [
    { value: "tablet",          label: "Integrated Flash / eMMC (standard for tablets)" },
    { value: "no_storage",      label: "No accessible storage" },
  ],
  external: [
    { value: "drive_external_ssd", label: "External SSD (Flash Storage)" },
    { value: "drive_external_hdd", label: "External HDD (Spinning Disk)" },
  ],
}

// ── OS-specific BIOS / identification instructions ────────────────────────────

interface BiosStep {
  icon: string
  title: string
  body: string
  code?: string
}

function getBiosSteps(os: string, category: string): BiosStep[] {
  if (category === "tablet" || category === "external") {
    return [
      {
        icon: "touch_app",
        title: "Physical Inspection",
        body: "For tablets and external drives, drive type can usually be determined by the device model number. Look up the model on the manufacturer's website or check the product label.",
      },
      {
        icon: "devices",
        title: "Manufacturer Spec Sheet",
        body: "Search: \"[Make Model] storage type\" — most tablets use integrated eMMC or UFS flash. External drives list HDD or SSD on the packaging.",
      },
    ]
  }

  if (os === "windows") {
    return [
      {
        icon: "settings",
        title: "Method 1 — Windows Settings (Recommended)",
        body: "Open Settings → System → Storage → Advanced storage settings → Disks & volumes. Click on the disk and look for \"Media type\" — it will show SSD or HDD.",
      },
      {
        icon: "restart_alt",
        title: "Method 2 — Boot into BIOS/UEFI",
        body: "Restart the device and press the BIOS key during startup. Look under \"Storage\" or \"Main\" tab for drive type and interface (NVMe, SATA).",
        code: "Common BIOS keys: F2 · F10 · F12 · Del · Esc\n(varies by manufacturer — shown briefly at boot)",
      },
      {
        icon: "terminal",
        title: "Method 3 — PowerShell",
        body: "Open PowerShell as Administrator and run:",
        code: "Get-PhysicalDisk | Select FriendlyName, MediaType, BusType",
      },
    ]
  }

  if (os === "linux") {
    return [
      {
        icon: "terminal",
        title: "Method 1 — lsblk (Recommended)",
        body: "Open a terminal and run the command below. ROTA=0 means SSD/NVMe (no rotation), ROTA=1 means HDD (spinning). TRAN shows the interface (nvme, sata).",
        code: "lsblk -d -o NAME,ROTA,TRAN,SIZE",
      },
      {
        icon: "terminal",
        title: "Method 2 — hdparm",
        body: "For more detail, run (replace sda with your drive name from lsblk):",
        code: "sudo hdparm -I /dev/sda | grep -i 'rotation\\|transport'",
      },
      {
        icon: "restart_alt",
        title: "Method 3 — BIOS at Boot",
        body: "Restart and press the BIOS key. Look in Storage or Main tab for drive model and interface type.",
        code: "Common BIOS keys: F2 · F10 · F12 · Del · Esc",
      },
    ]
  }

  if (os === "macos_apple") {
    return [
      {
        icon: "laptop_mac",
        title: "Apple Silicon — Always NVMe",
        body: "All Apple Silicon Macs (M1, M2, M3, M4) use Apple's proprietary NVMe-based storage soldered directly to the logic board. You can confirm this in System Report.",
      },
      {
        icon: "info",
        title: "Confirm via System Report",
        body: "Click  (Apple menu) → About This Mac → More Info → System Report → Hardware → Storage. Look for \"Apple Fabric\" or \"NVMe\" under Interface.",
      },
    ]
  }

  if (os === "macos_intel") {
    return [
      {
        icon: "info",
        title: "Check via System Report",
        body: "Click  (Apple menu) → About This Mac → More Info → System Report → Hardware → Storage. Find your drive and check the \"Interface\" field.",
      },
      {
        icon: "memory",
        title: "Interpreting the Interface field",
        body: "Interface shows: \"PCIe\" or \"NVMe\" = NVMe SSD · \"SATA\" = SATA SSD or HDD · Check \"Solid State\" field to distinguish SATA SSD from HDD (Yes = SSD, No = HDD).",
      },
    ]
  }

  return []
}

// ── Component ─────────────────────────────────────────────────────────────────

interface IntakeState {
  chassis_serial: string
  make_model: string
  os: string
  device_category: string
}

export default function DriveTypeIdentification() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as IntakeState) || {}

  const { chassis_serial = "", make_model = "", os = "windows", device_category = "laptop" } = state

  const driveOptions = DRIVE_OPTIONS[device_category] || DRIVE_OPTIONS["laptop"]
  const [driveType, setDriveType] = useState(driveOptions[0]?.value || "")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const biosSteps = getBiosSteps(os, device_category)

  const osLabel: Record<string, string> = {
    windows:     "Windows",
    linux:       "Linux",
    macos_apple: "macOS — Apple Silicon",
    macos_intel: "macOS — Intel",
  }

  const handleSubmit = async () => {
    if (!driveType) {
      setError("Please select a drive type.")
      return
    }
    setError("")
    setLoading(true)
    try {
      const response = await api.post("/api/devices", {
        chassis_serial,
        make_model,
        device_type: driveType,
        os,
      })
      navigate(`/device/${response.data.device_id}`)
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to register device. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Guard: if navigated directly without state
  if (!chassis_serial) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto text-center py-20">
          <span className="material-symbols-outlined text-5xl text-slate-500 mb-4 block">error</span>
          <p className="text-slate-400 mb-6">No device data found. Please start from the intake form.</p>
          <button
            onClick={() => navigate("/intake")}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-all"
          >
            Go to Intake
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-600 text-slate-300 flex items-center justify-center text-sm font-bold">✓</div>
              <span className="text-sm font-semibold text-slate-500">Device Details</span>
            </div>
            <div className="flex-1 h-px bg-orange-600/50 max-w-16"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center text-sm font-bold">2</div>
              <span className="text-sm font-semibold text-white">Identify Drive</span>
            </div>
            <div className="flex-1 h-px bg-slate-700 max-w-16"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-400 flex items-center justify-center text-sm font-bold">3</div>
              <span className="text-sm font-semibold text-slate-500">Wipe Procedure</span>
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Identify Drive Type</h1>
          <p className="text-slate-400 max-w-2xl leading-relaxed">
            Follow the steps below to identify the storage type in this device. The drive type determines the NIST-compliant sanitization procedure.
          </p>

          {/* Device context badge */}
          <div className="mt-4 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs text-slate-300">
              <span className="material-symbols-outlined text-sm">barcode_scanner</span>
              {chassis_serial}
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs text-slate-300">
              <span className="material-symbols-outlined text-sm">devices</span>
              {make_model}
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs text-slate-300">
              <span className="material-symbols-outlined text-sm">computer</span>
              {osLabel[os] || os}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left: Instructions */}
          <div className="lg:col-span-7 space-y-8">

            {/* BIOS Steps */}
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-400">search</span>
                How to Identify the Drive Type
              </h2>
              <div className="space-y-3">
                {biosSteps.map((step, i) => (
                  <div key={i} className="bg-slate-900 border border-slate-700 rounded-xl p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-orange-400">{step.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-200 mb-1">{step.title}</p>
                        <p className="text-sm text-slate-400 leading-relaxed">{step.body}</p>
                        {step.code && (
                          <pre className="mt-3 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">
                            {step.code}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Drive selection */}
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-400">hard_drive</span>
                Confirm Drive Type
              </h2>

              {error && (
                <div className="p-4 mb-4 bg-red-900/30 border border-red-700 rounded-lg">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-2 mb-6">
                {driveOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                      driveType === opt.value
                        ? "bg-orange-600/10 border-orange-600 text-white"
                        : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <input
                      type="radio"
                      name="drive_type"
                      value={opt.value}
                      checked={driveType === opt.value}
                      onChange={() => setDriveType(opt.value)}
                      className="accent-orange-600"
                    />
                    <span className="font-medium text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-10 py-4 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-lg shadow-orange-600/20 flex items-center gap-3 transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>assignment_turned_in</span>
                  {loading ? "Registering..." : "Register Device & Start Procedure"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/intake", { state })}
                  className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg transition-all"
                >
                  Back
                </button>
              </div>
            </div>
          </div>

          {/* Right: Reference panel */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 sticky top-24">
              <h3 className="font-bold text-white mb-5 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">menu_book</span>
                Drive Type Reference
              </h3>

              <div className="space-y-4 text-sm">
                <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                  <p className="font-bold text-slate-200 mb-1">NVMe SSD</p>
                  <p className="text-slate-400 text-xs leading-relaxed">Small M.2 stick plugged into motherboard. Very fast. Interface shows "PCIe" or "NVMe". ROTA=0, TRAN=nvme in Linux.</p>
                </div>
                <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                  <p className="font-bold text-slate-200 mb-1">SATA SSD</p>
                  <p className="text-slate-400 text-xs leading-relaxed">2.5" slim drive or M.2 SATA. Lighter than HDD, no moving parts. Interface shows "SATA". ROTA=0, TRAN=sata in Linux.</p>
                </div>
                <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                  <p className="font-bold text-slate-200 mb-1">HDD (Spinning Disk)</p>
                  <p className="text-slate-400 text-xs leading-relaxed">Heavy, thicker drive. You may hear it spinning. Interface shows "SATA". ROTA=1 in Linux. MediaType = "HDD" in Windows.</p>
                </div>
                <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                  <p className="font-bold text-slate-200 mb-1">Not sure?</p>
                  <p className="text-slate-400 text-xs leading-relaxed">Use the PowerShell/lsblk commands from the steps on the left. If in doubt, physically remove the drive and check the label — it will say SSD or HDD.</p>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                <span className="text-xs text-slate-400 font-medium">NIST SP 800-88 Rev. 2 — Procedure determined by media type</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}