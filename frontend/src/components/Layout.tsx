import { ReactNode, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import {
  FiHome,
  FiPlus,
  FiUsers,
  FiMenu,
  FiX,
} from "react-icons/fi"

interface LayoutProps {
  children: ReactNode
  showNav?: boolean
}

export default function Layout({ children, showNav = true }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const isActive = (path: string) => location.pathname === path

  const navItems = [
    { path: "/", label: "Dashboard", icon: FiHome },
    { path: "/intake", label: "Intake Device", icon: FiPlus },
    { path: "/admin/users", label: "Manage Users", icon: FiUsers },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {showNav && (
        <aside
          className={`${
            sidebarOpen ? "w-64" : "w-20"
          } bg-white border-r border-gray-200 shadow-sm transition-all duration-300 flex flex-col sticky top-0 h-screen`}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {sidebarOpen && (
                <h1 className="text-lg font-bold text-gray-900 truncate">
                  CityServe
                </h1>
              )}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-700"
              >
                {sidebarOpen ? (
                  <FiX className="w-5 h-5" />
                ) : (
                  <FiMenu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-3 py-6 space-y-2">
            {navItems.map(({ path, label, icon: Icon }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition ${
                  isActive(path)
                    ? "bg-gray-200 text-gray-900 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                title={!sidebarOpen ? label : ""}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>{label}</span>}
              </button>
            ))}
          </nav>

        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
