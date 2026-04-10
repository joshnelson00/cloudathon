import { useEffect, useState } from "react"
import { api } from "../api/client"

type ServiceMap = Record<string, string>

export default function Home() {
  const [status, setStatus] = useState("checking...")
  const [services, setServices] = useState<ServiceMap>({})

  const loadStatus = async () => {
    const health = await api.get("/health")
    setStatus(health.data?.status || "unknown")

    const integrations = await api.get("/api/integrations")
    setServices(integrations.data?.services || {})
  }

  useEffect(() => {
    loadStatus().catch(() => setStatus("offline"))
  }, [])

  return (
    <main className="max-w-2xl mx-auto my-8 px-4">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">Hackathon Starter</h1>

        <div className="mb-8 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
          <p className="text-lg font-semibold text-gray-700">
            API Health: <span className={status === "ok" ? "text-green-600" : "text-red-600"}>{status}</span>
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Service Connections</h2>
          {Object.keys(services).length === 0 ? (
            <p className="text-gray-500 italic">No services configured yet.</p>
          ) : (
            <ul className="space-y-3">
              {Object.entries(services).map(([name, endpoint]) => (
                <li key={name} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <strong className="text-gray-900 capitalize">{name}:</strong>
                  <span className="ml-2 text-gray-600">{endpoint || "not configured"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
