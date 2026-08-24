import { NavLink, useLocation } from 'react-router-dom'
import { trackModuleClick } from '../utils/tracker'
import {
  TrendingUp,
  Dna,
  Settings as SettingsIcon,
  Search,
  SlidersHorizontal,
  ChevronDown,
  Plus,
  Trash2,
  FolderOpen,
  BookOpen,
  Wand2,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import PricingModal from './PricingModal'
import { getStoredLicense } from '../utils/license'
import { useStore } from '../store/useStore'

// 简化的两级导航
const primaryNav = { path: '/workbench/competitor-analyzer', label: '拆解', icon: Search }

const secondaryNav = [
  { path: '/factory/pipeline', label: '创作工厂', icon: Wand2 },
  { path: '/workbench/case-library', label: '研究库', icon: BookOpen },
  { path: '/factory/style-dna', label: '风格DNA', icon: Dna },
  { path: '/workbench/performance-review', label: '数据复盘', icon: TrendingUp },
  { path: '/settings', label: '设置', icon: SettingsIcon },
]

function NavItem({ item, onNavigate }) {
  const Icon = item.icon
  const isDisabled = item.disabled

  const content = (
    <>
      <Icon size={18} strokeWidth={1.8} />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && (
        <span
          className={`shrink-0 text-[11px] px-1.5 py-0.5 rounded-full font-medium ${
            item.badgeColor === 'red'
              ? 'bg-red-50 text-red-600'
              : item.badgeColor === 'purple'
              ? 'bg-brand-50 text-brand-600'
              : item.disabled
              ? 'bg-gray-700 text-gray-400'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          {item.badge}
        </span>
      )}
    </>
  )

  if (isDisabled) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2 mx-2 rounded-lg text-gray-500 cursor-not-allowed opacity-50">
        {content}
      </div>
    )
  }

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      onClick={() => {
        trackModuleClick(item.path)
        onNavigate?.()
      }}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 mx-2 rounded-lg text-sm transition-colors ${
          isActive
            ? 'bg-brand-600 text-white font-medium'
            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
        }`
      }
    >
      {content}
    </NavLink>
  )
}

function ProjectSwitcher() {
  const projects = useStore((s) => s.projects)
  const currentProjectId = useStore((s) => s.currentProjectId)
  const switchProject = useStore((s) => s.switchProject)
  const createProject = useStore((s) => s.createProject)
  const deleteProject = useStore((s) => s.deleteProject)
  const currentProject = projects.find((p) => p.id === currentProjectId) || null

  const [open, setOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPlatform, setNewPlatform] = useState('小红书')
  const [menuOpen, setMenuOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleCreate = () => {
    if (!newName.trim()) return
    createProject({ name: newName.trim(), platform: newPlatform })
    setNewName('')
    setShowCreate(false)
    setOpen(false)
  }

  const handleDelete = (e, pid) => {
    e.stopPropagation()
    if (projects.length <= 1) return
    if (confirm('确定删除此项目及其所有内容？')) {
      deleteProject(pid)
    }
  }

  if (!currentProject) return null

  return (
    <div ref={ref} className="px-3 py-3 border-b border-gray-800">
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-gray-800/60 hover:bg-gray-800 text-left transition-colors"
        >
          <div className="w-7 h-7 rounded-md bg-brand-600 flex items-center justify-center shrink-0">
            <FolderOpen size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{currentProject.name}</div>
            <div className="text-[11px] text-gray-400">{currentProject.platform} · {currentProject.category}</div>
          </div>
          <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a24] border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
            {projects.map((p) => (
              <div
                key={p.id}
                className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-800 transition-colors ${
                  p.id === currentProjectId ? 'bg-brand-600/20' : ''
                }`}
                onClick={() => {
                  switchProject(p.id)
                  setOpen(false)
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className={`text-sm truncate ${p.id === currentProjectId ? 'text-white font-medium' : 'text-gray-300'}`}>
                    {p.name}
                  </div>
                  <div className="text-[11px] text-gray-500">{p.platform}</div>
                </div>
                {projects.length > 1 && (
                  <button
                    onClick={(e) => handleDelete(e, p.id)}
                    className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
                    style={{ opacity: p.id === currentProjectId ? 1 : undefined }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}

            <div className="border-t border-gray-700">
              {!showCreate ? (
                <button
                  onClick={() => setShowCreate(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-brand-400 hover:bg-gray-800 hover:text-brand-300 transition-colors"
                >
                  <Plus size={14} />
                  新建项目
                </button>
              ) : (
                <div className="p-3 space-y-2 bg-gray-900/50">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="项目名称"
                    className="w-full px-2.5 py-1.5 rounded-md bg-gray-800 border border-gray-700 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-brand-500"
                    autoFocus
                  />
                  <select
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-md bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-brand-500"
                  >
                    <option>小红书</option>
                    <option>Instagram</option>
                    <option>TikTok</option>
                    <option>YouTube</option>
                    <option>微信公众号</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreate}
                      className="flex-1 px-3 py-1.5 rounded-md bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
                    >
                      创建
                    </button>
                    <button
                      onClick={() => { setShowCreate(false); setNewName('') }}
                      className="px-3 py-1.5 rounded-md bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Sidebar({ mobileOpen = false, onClose }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [showPricing, setShowPricing] = useState(false)
  return (
    <>
      {/* 移动端遮罩 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
        w-56 shrink-0 flex flex-col bg-[#0f0f13] text-white h-full overflow-y-auto
        fixed md:static inset-y-0 left-0 z-50
        transition-transform duration-200
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* 品牌 */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-800">
          <div className="w-7 h-7 rounded-md bg-brand-600 flex items-center justify-center text-sm font-bold">
            C
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[15px] tracking-tight leading-tight">果核</span>
            <span className="text-[9px] text-gray-500 leading-tight mt-0.5">AI 爆款拆解工具</span>
          </div>
        </div>

        {/* 项目切换 */}
        <ProjectSwitcher />

        {/* 导航 */}
        <nav className="flex-1 px-1 pb-4 space-y-1">
          {/* 主入口：拆解 */}
          <NavItem item={primaryNav} onNavigate={onClose} />

          {/* 分隔线 */}
          <div className="my-2 mx-3 border-t border-gray-800" />

          {/* 更多功能 */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className="flex items-center gap-2.5 px-3 py-2 mx-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors w-[calc(100%-1rem)]"
          >
            <SettingsIcon size={18} strokeWidth={1.8} />
            <span className="flex-1 text-left">更多</span>
            <ChevronDown size={14} className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* 二级菜单 */}
          {moreOpen && (
            <div className="space-y-0.5">
              {secondaryNav.map((item, i) => (
                <NavItem key={i} item={item} onNavigate={onClose} />
              ))}
            </div>
          )}
        </nav>

        {/* 底部用户 */}
        <div className="px-3 py-3 border-t border-gray-800">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-7 h-7 rounded-full bg-brand-600/20 text-brand-400 flex items-center justify-center text-xs font-bold border border-brand-600/30">
              U
            </div>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setShowPricing(true)}>
              <div className="text-sm font-medium text-white truncate">User</div>
              <div className="text-[11px] text-gray-500">
                {getStoredLicense() ? `${getStoredLicense().tier === 'lifetime' ? '终身版' : 'Pro'} 已激活` : '免费版 · 点击升级'}
              </div>
            </div>
            <button className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400" onClick={() => setShowPricing(true)}>
              <SlidersHorizontal size={14} />
            </button>
          </div>
        </div>

        <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
      </aside>
    </>
  )
}