import axios from "axios"

// Determine API URL based on environment
const getBaseURL = (): string => {
  // 1. Use explicit environment variable if set
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }

  // 2. Browser environment - use current location
  if (typeof globalThis !== "undefined" && globalThis.location) {
    const hostname = globalThis.location.hostname
    const protocol = globalThis.location.protocol

    // If running on localhost (development), use localhost:8000
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8000"
    }

    // If running on a deployed domain, use same origin but with backend port
    // This works if backend and frontend are on same EC2 instance
    return `${protocol}//${hostname}:8000`
  }

  // Fallback to localhost (shouldn't reach here in browser)
  return "http://localhost:8000"
}

const baseURL = getBaseURL()

// Log the API URL for debugging (only in dev)
if (import.meta.env.DEV) {
  console.log("API Base URL:", baseURL)
}

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Add request interceptor to include JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
