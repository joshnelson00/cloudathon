import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../api/client"
import Layout from "../components/Layout"

export default function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await api.post("/auth/login", { username, password })
      localStorage.setItem("token", response.data.access_token)
      navigate("/")
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout showNav={false}>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              CityServe Device Destruction
            </h1>
            <p className="text-gray-600 mb-8">
              NIST SP 800-88 Compliant Device Sanitization System
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition"
              >
                Create New Account
              </button>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center mb-3">
                Demo credentials: username: "worker1" | password: "password123"
              </p>
              <p className="text-xs text-gray-500 text-center">
                Admin account: username: "admin" | password: "admin123"
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
