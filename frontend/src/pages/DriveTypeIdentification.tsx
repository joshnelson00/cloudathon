import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { api } from "../api/client"
import Layout from "../components/Layout"

const BUILTIN_DEVICE_TYPES = new Set([
  "laptop_ssd_nvme", "laptop_ssd_sata", "laptop_hdd",
  "desktop_ssd", "desktop_hdd",
  "tablet", "no_storage",
  "drive_external_ssd", "drive_external_hdd",
])

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

// ── Situation type ────────────────────────────────────────────────────────────

type Situation = "os_access" | "bios_only" | "bare_drive"

const SITUATION_OPTIONS: { value: Situation; icon: string; label: string; sub: string }[] = [
  {
    value: "os_access",
    icon: "computer",
    label: "I can log into the operating system",
    sub: "Device boots normally — use OS tools to identify the drive",
  },
  {
    value: "bios_only",
    icon: "settings_applications",
    label: "Device won't boot / BIOS access only",
    sub: "Can reach BIOS/UEFI but cannot log into the OS",
  },
  {
    value: "bare_drive",
    icon: "hard_drive",
    label: "I only have the drive (removed from device)",
    sub: "Drive has been removed or was donated separately",
  },
]

// ── Identification instructions ───────────────────────────────────────────────

interface BiosStep {
  icon: string
  title: string
  body: string
  code?: string
}

function getBiosSteps(os: string, category: string, situation: Situation): BiosStep[] {
  // ── Tablet ────────────────────────────────────────────────────────────────
  if (category === "tablet") {
    return [
      {
        icon: "touch_app",
        title: "Check Settings (if accessible)",
        body: "If the tablet is powered on, go to Settings → General → About (iOS) or Settings → About Phone/Tablet → Storage (Android). This will show total storage capacity and model.",
      },
      {
        icon: "devices",
        title: "Check the Device Label or Packaging",
        body: "The storage capacity and type are printed on the back label or original packaging. Tablets universally use integrated eMMC or UFS flash — there is no removable drive.",
      },
      {
        icon: "search",
        title: "Look Up the Model Number",
        body: "Search \"[Make Model] specs\" — e.g. \"iPad 9th Gen specs\". The manufacturer's spec page will confirm storage type and capacity.",
      },
    ]
  }

  // ── External drive ────────────────────────────────────────────────────────
  if (category === "external") {
    return [
      {
        icon: "hard_drive",
        title: "Check the Drive Housing or Label",
        body: "Most external drives clearly label themselves as HDD or SSD on the housing. An HDD will feel heavier and you may hear or feel it spinning. An SSD will be lighter and completely silent.",
      },
      {
        icon: "search",
        title: "Check the Model Number",
        body: "The model number is printed on the label. Search it to confirm — e.g. \"WD Elements 2TB\" is HDD, \"Samsung T7\" is SSD. The product packaging also lists the type.",
      },
      {
        icon: "usb",
        title: "Connect to a Computer to Confirm",
        body: "Plug the drive into any computer via USB and use an OS command to confirm.",
        code: "Windows PowerShell:\nGet-PhysicalDisk | Select FriendlyName, MediaType, BusType\n\nLinux:\nlsblk -d -o NAME,ROTA,TRAN,SIZE\n(ROTA=0 = SSD, ROTA=1 = HDD)",
      },
    ]
  }

  // ── Laptop / Desktop ──────────────────────────────────────────────────────

  if (situation === "os_access") {
    if (os === "windows") {
      return [
        {
          icon: "settings",
          title: "Method 1 — Windows Settings (Recommended)",
          body: "Open Settings → System → Storage → Advanced storage settings → Disks & volumes. Click on the disk and look for \"Media type\" — it will show SSD or HDD.",
        },
        {
          icon: "terminal",
          title: "Method 2 — PowerShell",
          body: "Open PowerShell as Administrator and run:",
          code: "Get-PhysicalDisk | Select FriendlyName, MediaType, BusType",
        },
        {
          icon: "restart_alt",
          title: "Method 3 — Boot into BIOS/UEFI",
          body: "Restart the device and press the BIOS key during startup. Look under \"Storage\" or \"Main\" tab for drive type and interface (NVMe, SATA).",
          code: "Common BIOS keys: F2 · F10 · F12 · Del · Esc\n(varies by manufacturer — shown briefly at boot)",
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
          body: "Click \u{1F34E} (Apple menu) → About This Mac → More Info → System Report → Hardware → Storage. Look for \"Apple Fabric\" or \"NVMe\" under Interface.",
        },
      ]
    }

    if (os === "macos_intel") {
      return [
        {
          icon: "info",
          title: "Check via System Report",
          body: "Click \u{1F34E} (Apple menu) → About This Mac → More Info → System Report → Hardware → Storage. Find your drive and check the \"Interface\" field.",
        },
        {
          icon: "memory",
          title: "Interpreting the Interface field",
          body: "Interface shows: \"PCIe\" or \"NVMe\" = NVMe SSD · \"SATA\" = SATA SSD or HDD · Check \"Solid State\" field to distinguish SATA SSD from HDD (Yes = SSD, No = HDD).",
        },
      ]
    }
  }

  if (situation === "bios_only") {
    return [
      {
        icon: "restart_alt",
        title: "Step 1 — Enter BIOS/UEFI at Startup",
        body: "Power on (or restart) the device and press the BIOS key immediately when the manufacturer logo appears. You typically have 1–2 seconds.",
        code: "Common BIOS keys: F2 · F10 · F12 · Del · Esc\nHP: F10 or Esc · Dell: F2 or F12 · Lenovo: F1 or F2\nAsus: Del or F2 · Acer: F2 or Del · Surface: hold Volume Up",
      },
      {
        icon: "storage",
        title: "Step 2 — Find Drive Info in BIOS",
        body: "Navigate to the Storage, Main, or Boot tab. Look for a list of connected drives. The drive entry usually shows the model name and interface type — NVMe drives show as \"M.2 NVMe\" or \"PCIe SSD\". SATA drives show as \"SATA SSD\" or list an RPM value (HDD).",
      },
      {
        icon: "usb",
        title: "Step 3 — Boot a USB Live Environment (if BIOS isn't enough)",
        body: "Create a bootable Ubuntu Live USB on another computer and boot from it. No installation needed — it runs entirely from USB. Then open a terminal and run:",
        code: "lsblk -d -o NAME,ROTA,TRAN,SIZE\n(ROTA=0 = SSD/NVMe, ROTA=1 = HDD · TRAN=nvme or sata)",
      },
      {
        icon: "build",
        title: "Step 4 — Physical Inspection (if device won't POST)",
        body: "If the device won't reach BIOS, remove the bottom panel (laptop) or side panel (desktop) to access the drive directly. Most laptops use Phillips-head screws on the bottom. Once open, identify the drive by form factor: M.2 stick = NVMe/SATA SSD, 2.5\" drive = SATA SSD or HDD, 3.5\" drive = Desktop HDD. Check the drive label for confirmation.",
      },
    ]
  }

  if (situation === "bare_drive") {
    return [
      {
        icon: "straighten",
        title: "Step 1 — Identify the Form Factor",
        body: "The physical shape tells you the drive family. Match what you have:",
        code: "M.2 stick (~80mm long, looks like a RAM chip)\n  → NVMe SSD or M.2 SATA SSD — check label to tell them apart\n\n2.5\" rectangular, thin and light, no moving parts\n  → SATA SSD\n\n2.5\" rectangular, heavier, you can feel/hear platters spinning\n  → Laptop HDD\n\n3.5\" large rectangular drive\n  → Desktop HDD",
      },
      {
        icon: "label",
        title: "Step 2 — Read the Drive Label",
        body: "The sticker on the drive almost always identifies the type. Look for:",
        code: "\"SSD\" or \"Solid State Drive\" → SSD\n\"NVMe\" or \"PCIe\" → NVMe SSD\nRPM value (5400 RPM, 7200 RPM) → HDD\n\"M.2\" with no NVMe/PCIe → likely M.2 SATA SSD\nModel numbers: MZ- or MZVL- prefix = Samsung NVMe\n               ST or WD prefix = Seagate or WD HDD",
      },
      {
        icon: "memory",
        title: "Step 3 — Telling M.2 NVMe from M.2 SATA (if M.2 form factor)",
        body: "Both look like small sticks but use different interfaces. Check the label first — it will say NVMe or PCIe for NVMe drives. Physically, an M-key only notch (one notch near the connector, further from the edge) = always NVMe. A B+M key (two notches) = could be either — trust the label.",
        code: "M-key (one notch, right side) → always NVMe\nB+M key (two notches) → check label for NVMe vs SATA\nMost M.2 drives made after 2018 in laptops are NVMe",
      },
      {
        icon: "usb",
        title: "Step 4 — Connect via USB Dock to Confirm (optional)",
        body: "For certainty, connect the bare drive to any working computer using a USB enclosure or universal drive dock (available for M.2 and 2.5\"/3.5\" drives). Then run the identification command on that computer.",
        code: "Windows (PowerShell as Admin):\nGet-PhysicalDisk | Select FriendlyName, MediaType, BusType\n\nLinux / macOS (Terminal):\nlsblk -d -o NAME,ROTA,TRAN,SIZE\n(ROTA=0 = SSD/NVMe, ROTA=1 = HDD)",
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

  const driveOptions = DRIVE_OPTIONS[device_category] || []
  const [driveType, setDriveType] = useState(driveOptions[0]?.value || "")
  const [situation, setSituation] = useState<Situation>(os === "bare_drive" ? "bare_drive" : "os_access")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [customProcedures, setCustomProcedures] = useState<{ value: string; label: string }[]>([])

  const showSituationSelector = (cat: string) => cat === "laptop" || cat === "desktop"

  useEffect(() => {
    if (device_category !== "other") return
    api.get("/api/procedures")
      .then((res) => {
        const all: { procedure_id: string; label: string; device_type: string }[] = res.data.procedures || []
        const custom = all
          .filter((p) => !BUILTIN_DEVICE_TYPES.has(p.device_type))
          .map((p) => ({ value: p.device_type, label: p.label }))
        setCustomProcedures(custom)
        if (custom.length > 0) setDriveType(custom[0].value)
      })
      .catch(() => {})
  }, [device_category])

  const effectiveSituation: Situation =
    showSituationSelector(device_category) ? situation : "os_access"

  const biosSteps = getBiosSteps(os, device_category, effectiveSituation)

  const osLabel: Record<string, string> = {
    windows:     "Windows",
    linux:       "Linux",
    macos_apple: "macOS — Apple Silicon",
    macos_intel: "macOS — Intel",
    bare_drive:  "Bare Drive / No OS",
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
            Follow the steps below to identify the storage type. The drive type determines the correct NIST sanitization procedure.
          </p>

          {/* Device context badges */}
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

            {/* Situation selector — laptop/desktop only */}
            {showSituationSelector(device_category) && (
              <div>
                <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-400">help</span>
                  What is your situation?
                </h2>
                {os === "bare_drive" ? (
                  <div className="flex items-center gap-4 p-4 rounded-xl border bg-orange-600/10 border-orange-600">
                    <div className="w-9 h-9 rounded-lg bg-orange-600/20 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-lg text-orange-400">hard_drive</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">I only have the drive (removed from device)</p>
                      <p className="text-xs text-slate-400 mt-0.5">Selected at intake — showing physical identification instructions below.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {SITUATION_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                          situation === opt.value
                            ? "bg-orange-600/10 border-orange-600"
                            : "bg-slate-900 border-slate-700 hover:border-slate-500"
                        }`}
                      >
                        <input
                          type="radio"
                          name="situation"
                          value={opt.value}
                          checked={situation === opt.value}
                          onChange={() => setSituation(opt.value)}
                          className="accent-orange-600 shrink-0"
                        />
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          situation === opt.value ? "bg-orange-600/20" : "bg-slate-800"
                        }`}>
                          <span className={`material-symbols-outlined text-lg ${
                            situation === opt.value ? "text-orange-400" : "text-slate-400"
                          }`}>{opt.icon}</span>
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${situation === opt.value ? "text-white" : "text-slate-300"}`}>
                            {opt.label}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">{opt.sub}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Identification steps */}
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

            {/* Drive type selection */}
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

              {device_category === "other" ? (
                customProcedures.length === 0 ? (
                  <div className="p-5 bg-slate-800/60 border border-slate-700 rounded-xl text-slate-400 text-sm mb-6">
                    No custom procedures found. Ask an admin to create one under Admin → Create Procedure.
                  </div>
                ) : (
                  <div className="space-y-2 mb-6">
                    {customProcedures.map((opt) => (
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
                        <div>
                          <span className="font-medium text-sm block">{opt.label}</span>
                          <span className="text-xs text-slate-500 font-mono">{opt.value}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )
              ) : (
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
              )}

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
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 sticky top-24 space-y-6">
              <div>
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-400">menu_book</span>
                  Drive Type Reference
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                    <p className="font-bold text-slate-200 mb-1">NVMe SSD</p>
                    <p className="text-slate-400 text-xs leading-relaxed">M.2 stick (small, ~80mm). Very fast. Label says "NVMe" or "PCIe". ROTA=0, TRAN=nvme in Linux. Interface = PCIe in macOS.</p>
                  </div>
                  <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                    <p className="font-bold text-slate-200 mb-1">SATA SSD</p>
                    <p className="text-slate-400 text-xs leading-relaxed">2.5" slim or M.2 SATA. Light, no moving parts, silent. Interface = SATA. ROTA=0, TRAN=sata in Linux.</p>
                  </div>
                  <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                    <p className="font-bold text-slate-200 mb-1">HDD (Spinning Disk)</p>
                    <p className="text-slate-400 text-xs leading-relaxed">2.5" (laptop) or 3.5" (desktop). Heavier, you may hear it spin. Label shows RPM (5400/7200). ROTA=1 in Linux.</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-5">
                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400">build</span>
                  Drive Removal Guide
                </h3>
                <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
                  <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                    <p className="font-bold text-slate-300 mb-1">Laptop</p>
                    <p>Remove Phillips-head screws from bottom panel. Lift panel carefully. 2.5" drives are in a bay near one edge — remove 1–2 mounting screws and slide out. M.2 drives are on the motherboard — remove one retaining screw, lift at a slight angle and slide out.</p>
                  </div>
                  <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                    <p className="font-bold text-slate-300 mb-1">Desktop</p>
                    <p>Remove side panel (usually thumb screws on rear). 3.5" drives are in drive bays — disconnect SATA data + power cables, remove 4 mounting screws. 2.5" drives may be on a bracket. M.2 is on the motherboard.</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4 flex items-center gap-2">
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