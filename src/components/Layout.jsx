import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import { Menu } from 'lucide-react'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      {/* 移动端顶栏：仅手机显示 */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 py-3 bg-[#0f0f13] text-white">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1 -ml-1 hover:bg-gray-800 rounded-md transition-colors"
          aria-label="打开菜单"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-brand-600 flex items-center justify-center text-xs font-bold">
            C
          </div>
          <span className="font-semibold text-sm">果核</span>
        </div>
      </div>

      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  )
}
