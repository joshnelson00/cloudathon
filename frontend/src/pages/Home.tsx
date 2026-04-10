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
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Hackathon Starter</h1>
      <p>API health: {status}</p>

      <h2>Future Service Connections</h2>
      <ul>
        {Object.keys(services).length === 0 && <li>No services configured yet.</li>}
        {Object.entries(services).map(([name, endpoint]) => (
          <li key={name}>
            <strong>{name}</strong>: {endpoint || "not configured"}
          </li>
        ))}
      </ul>
    </main>
  )
}
