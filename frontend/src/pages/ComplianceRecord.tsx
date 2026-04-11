import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import confetti from "canvas-confetti"
import { api } from "../api/client"
import Layout from "../components/Layout"

interface ComplianceData {
  device_id: string
  comp_doc: string
  generated_at?: string
}

export default function ComplianceRecord() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<ComplianceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get(`/api/compliance/${id}`)
      .then((res) => {
        setData(res.data)
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#ea580c", "#10b981", "#ffffff"] })
        setTimeout(() => confetti({ particleCount: 60, spread: 120, origin: { y: 0.5, x: 0.2 }, colors: ["#ea580c", "#f97316"] }), 300)
        setTimeout(() => confetti({ particleCount: 60, spread: 120, origin: { y: 0.5, x: 0.8 }, colors: ["#10b981", "#34d399"] }), 500)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const handleDownload = () => {
    if (!data?.comp_doc) return
    setDownloading(true)
    window.open(data.comp_doc, "_blank")
    setDownloading(false)
  }

  const generatedDate = data?.generated_at
    ? new Date(data.generated_at).toLocaleDateString("en-US", { dateStyle: "long" })
    : "N/A"
  const generatedTime = data?.generated_at
    ? new Date(data.generated_at).toLocaleTimeString("en-US", { timeStyle: "short" })
    : "N/A"

  if (loading) {
    return <Layout><div className="text-center py-12 text-slate-400">Loading compliance record...</div></Layout>
  }

  if (!data) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">Compliance record not found</p>
          <button onClick={() => navigate("/")} className="text-orange-500 hover:underline font-bold">
            Return to Dashboard
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Success Banner */}
        <div className="bg-emerald-950/40 border-2 border-emerald-600/50 rounded-xl p-8 flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-emerald-400 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white" style={{ fontFamily: "Manrope, sans-serif" }}>
              Destruction Complete
            </h1>
            <p className="text-emerald-400 mt-1">NIST SP 800-88 compliant destruction certificate generated</p>
          </div>
        </div>

        {/* Certificate Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="px-8 py-5 border-b border-slate-800 bg-slate-800/50 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: "Manrope, sans-serif" }}>
              Certificate of Destruction
            </h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Verified</span>
            </div>
          </div>

          <div className="p-8 space-y-8">
            {/* Device Info */}
            <section>
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-widest mb-4">Device Information</h3>
              <div className="grid grid-cols-2 gap-4 bg-slate-800/50 p-5 rounded-lg border border-slate-700">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Tracking ID</p>
                  <p className="font-mono font-bold text-slate-200 text-sm break-all">{data.device_id}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Organization</p>
                  <p className="font-bold text-slate-200">CityServe Arizona</p>
                </div>
              </div>
            </section>

            {/* Destruction Info */}
            <section>
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-widest mb-4">Destruction Information</h3>
              <div className="grid grid-cols-2 gap-4 bg-slate-800/50 p-5 rounded-lg border border-slate-700">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Sanitization Method</p>
                  <p className="font-bold text-slate-200">NIST SP 800-88 Compliant</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Compliance Standard</p>
                  <p className="font-bold text-slate-200">Rev. 2</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Generated Date</p>
                  <p className="font-bold text-slate-200">{generatedDate}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Generated Time</p>
                  <p className="font-bold text-slate-200">{generatedTime}</p>
                </div>
              </div>
            </section>

            {/* PDF Download */}
            <section className="border-2 border-dashed border-orange-600/40 rounded-xl p-6 bg-orange-950/20 text-center">
              <span className="material-symbols-outlined text-orange-500 text-4xl mb-3 block">description</span>
              <h4 className="font-bold text-white mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>
                Compliance Certificate Ready
              </h4>
              <p className="text-sm text-slate-400 mb-5">
                Download the PDF certificate of destruction for your records and compliance documentation.
              </p>
              <button
                onClick={handleDownload}
                disabled={downloading || !data.comp_doc}
                className="bg-orange-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition inline-flex items-center gap-2 active:scale-95"
              >
                <span className="material-symbols-outlined">download</span>
                {downloading ? "Downloading..." : "Download Certificate"}
              </button>
            </section>

            {/* Legal Notice */}
            <div className="bg-amber-950/30 border border-amber-700/40 rounded-lg p-4">
              <p className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">gpp_maybe</span>
                LEGAL COMPLIANCE NOTICE
              </p>
              <p className="text-xs text-amber-300/70 leading-relaxed">
                This certificate serves as proof of device destruction in accordance with NIST SP 800-88 Rev. 2 guidelines.
                Retain this document for audit purposes and compliance documentation for a minimum of 3 years.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate("/intake")}
            className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 transition flex items-center justify-center gap-2 active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Intake Another Device
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex-1 px-6 py-3 bg-slate-800 text-slate-300 rounded-lg font-bold hover:bg-slate-700 transition active:scale-95"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </Layout>
  )
}
