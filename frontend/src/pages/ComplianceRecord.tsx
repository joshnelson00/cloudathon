import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { api } from "../api/client"
import Layout from "../components/Layout"

interface ComplianceData {
  device_id: string
  compliance_doc_url: string
  generated_at: string
  device_type: string
  chassis_serial: string
  status: string
}

export default function ComplianceRecord() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<ComplianceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    loadCompliance()
  }, [id])

  const loadCompliance = async () => {
    if (!id) return
    try {
      setLoading(true)
      const response = await api.get(`/api/compliance/${id}`)
      setData(response.data)
    } catch (error) {
      console.error("Failed to load compliance data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!data?.compliance_doc_url) return

    try {
      setDownloading(true)
      // In a real app, this would fetch the presigned URL and download
      window.open(data.compliance_doc_url, "_blank")
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">Loading compliance record...</div>
      </Layout>
    )
  }

  if (!data) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">Compliance record not found</p>
          <button
            onClick={() => navigate("/")}
            className="text-blue-600 hover:underline font-bold"
          >
            Return to Dashboard
          </button>
        </div>
      </Layout>
    )
  }

  const generatedDate = new Date(data.generated_at).toLocaleDateString()
  const generatedTime = new Date(data.generated_at).toLocaleTimeString()

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Success Header */}
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-8 text-center">
          <p className="text-4xl mb-4">✅</p>
          <h1 className="text-3xl font-bold text-green-900 mb-2">
            Destruction Complete
          </h1>
          <p className="text-green-800">
            NIST SP 800-88 compliant destruction certificate generated
          </p>
        </div>

        {/* Certificate Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Certificate of Destruction
          </h2>

          <div className="space-y-6">
            {/* Device Information */}
            <section>
              <h3 className="text-sm font-bold uppercase text-gray-600 mb-4 tracking-wider">
                Device Information
              </h3>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Tracking ID</p>
                  <p className="font-mono font-bold text-gray-900">
                    {data.device_id}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Serial Number</p>
                  <p className="font-bold text-gray-900">
                    {data.chassis_serial}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Device Type</p>
                  <p className="font-bold text-gray-900">{data.device_type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Status</p>
                  <p className="font-bold text-green-600">{data.status}</p>
                </div>
              </div>
            </section>

            {/* Destruction Information */}
            <section>
              <h3 className="text-sm font-bold uppercase text-gray-600 mb-4 tracking-wider">
                Destruction Information
              </h3>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded">
                <div>
                  <p className="text-xs text-gray-600 mb-1">
                    Sanitization Method
                  </p>
                  <p className="font-bold text-gray-900">
                    NIST 800-88 Compliant
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Generated Date</p>
                  <p className="font-bold text-gray-900">{generatedDate}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Generated Time</p>
                  <p className="font-bold text-gray-900">{generatedTime}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Organization</p>
                  <p className="font-bold text-gray-900">CityServe Arizona</p>
                </div>
              </div>
            </section>

            {/* Certificate Document Section */}
            <section className="border-2 border-dashed border-blue-400 rounded-lg p-6 bg-blue-50 text-center">
              <p className="text-3xl mb-3">📄</p>
              <h4 className="font-bold text-gray-900 mb-2">
                Compliance Certificate Ready
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                Download the PDF certificate of destruction for your records and
                compliance documentation
              </p>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400 transition inline-flex items-center gap-2"
              >
                <span>⬇️</span>
                {downloading ? "Downloading..." : "Download Certificate"}
              </button>
            </section>

            {/* Legal Notice */}
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
              <p className="text-xs font-bold text-amber-900 mb-2">
                ⚠️ LEGAL COMPLIANCE
              </p>
              <p className="text-xs text-amber-800 leading-relaxed">
                This certificate serves as proof of device destruction in
                accordance with NIST SP 800-88 Rev. 1 guidelines. Retain this
                document for audit purposes and compliance documentation.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex gap-4">
            <button
              onClick={() => navigate("/intake")}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
            >
              + Intake Another Device
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
