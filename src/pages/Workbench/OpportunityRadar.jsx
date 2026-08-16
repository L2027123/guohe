import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import {
  Radar,
  TrendingUp,
  Flame,
  Lightbulb,
  ArrowRight,
  Sparkles,
  FileText,
  Search,
  BarChart3,
} from 'lucide-react'

function EntryCard({ icon: Icon, title, desc, badge, path, color, onClick }) {
  const colorMap = {
    purple: 'bg-brand-50 text-brand-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
  }
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 p-5 cursor-pointer hover:border-brand-200 hover:shadow-md hover:-translate-y-0.5 transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon size={22} />
        </div>
        {badge && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
            {badge}
          </span>
        )}
      </div>
      <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-brand-700 transition-colors">
        {title}
      </h3>
      <p className="text-sm text-gray-500 leading-relaxed mb-3">{desc}</p>
      <div className="flex items-center gap-1 text-sm text-brand-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        立即进入
        <ArrowRight size={14} />
      </div>
    </div>
  )
}

export default function OpportunityRadar() {
  const navigate = useNavigate()
  const currentProjectId = useStore((s) => s.currentProjectId)
  const projects = useStore((s) => s.projects)
  const allPatterns = useStore((s) => s.contentPatterns)
  const allTopics = useStore((s) => s.topics)
  const allInspirations = useStore((s) => s.learningLogs)

  const currentProject = useMemo(
    () => projects.find((p) => p.id === currentProjectId),
    [projects, currentProjectId]
  )
  const projectPatterns = useMemo(
    () => allPatterns.filter((p) => p.projectId === currentProjectId),
    [allPatterns, currentProjectId]
  )
  const projectTopics = useMemo(
    () => allTopics.filter((t) => t.projectId === currentProjectId),
    [allTopics, currentProjectId]
  )
  const projectInspirations = useMemo(
    () => (allInspirations || []).filter((l) => l.projectId === currentProjectId),
    [allInspirations, currentProjectId]
  )

  const entries = [
    {
      icon: TrendingUp,
      title: '趋势机会',
      desc: '扫描热门趋势，发现当下应该追的内容机会和流量风口',
      badge: projectTopics.length > 0 ? `${projectTopics.length} 个选题` : undefined,
      path: '/intelligence/trends',
      color: 'purple',
    },
    {
      icon: Flame,
      title: '爆款案例分析',
      desc: '拆解优秀内容的结构，提取 Hook、情绪、CTA 等爆款规律',
      badge: projectPatterns.length > 0 ? `${projectPatterns.length} 条模式` : undefined,
      path: '/intelligence/viral-elements',
      color: 'blue',
    },
    {
      icon: Lightbulb,
      title: '内容灵感收藏',
      desc: '随时收集看到的好内容，AI 自动分析并沉淀为你的内容素材库',
      badge: projectInspirations.length > 0 ? `${projectInspirations.length} 条记录` : undefined,
      path: '/intelligence/inspiration',
      color: 'amber',
    },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* 顶部栏 */}
      <header className="px-6 py-4 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Radar size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">AI 机会雷达</h1>
            <p className="text-sm text-gray-500 mt-0.5">发现「现在应该做什么内容」</p>
          </div>
        </div>
      </header>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* 工作台说明 */}
          <div className="bg-gradient-to-r from-brand-50 to-indigo-50 rounded-2xl p-6 border border-brand-100">
            <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Sparkles size={18} className="text-brand-600" />
              工作台说明
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              AI 机会雷达帮助你持续发现内容机会。
              先扫描<span className="font-medium text-brand-700">趋势机会</span>找到流量方向，
              再通过<span className="font-medium text-brand-700">爆款拆解</span>学习成功内容的规律，
              最后用<span className="font-medium text-brand-700">灵感收藏</span>沉淀自己的素材库。
            </p>
          </div>

          {/* 数据概览 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Search size={16} className="text-brand-500" />
                <span className="text-xs text-gray-500">趋势选题</span>
              </div>
              <div className="text-2xl font-semibold text-gray-900 tabular">
                {projectTopics.length}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                {projectTopics.length > 0 ? '已有选题可直接使用' : '去趋势页发现机会'}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={16} className="text-blue-500" />
                <span className="text-xs text-gray-500">学习模式</span>
              </div>
              <div className="text-2xl font-semibold text-gray-900 tabular">
                {projectPatterns.length}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                {projectPatterns.length > 0 ? '已拆解爆款案例规律' : '先拆解 3 个爆款'}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={16} className="text-amber-500" />
                <span className="text-xs text-gray-500">灵感收藏</span>
              </div>
              <div className="text-2xl font-semibold text-gray-900 tabular">
                {projectInspirations.length}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                {projectInspirations.length > 0 ? '灵感库持续积累中' : '随时收集好内容'}
              </div>
            </div>
          </div>

          {/* 三个入口卡片 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">工作台入口</h3>
            <div className="grid grid-cols-3 gap-4">
              {entries.map((e, i) => (
                <EntryCard
                  key={i}
                  {...e}
                  onClick={() => navigate(e.path)}
                />
              ))}
            </div>
          </div>

          {/* 下一步建议 */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ArrowRight size={18} className="text-brand-600" />
              下一步建议
            </h3>
            <div className="space-y-2">
              {projectTopics.length === 0 && (
                <div
                  onClick={() => navigate('/intelligence/trends')}
                  className="flex items-center justify-between p-3 rounded-lg bg-brand-50/50 cursor-pointer hover:bg-brand-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">1</div>
                    <span className="text-sm text-gray-800">去趋势发现页，找到第一个内容方向</span>
                  </div>
                  <ArrowRight size={16} className="text-brand-600" />
                </div>
              )}
              {projectPatterns.length === 0 && (
                <div
                  onClick={() => navigate('/intelligence/viral-elements')}
                  className="flex items-center justify-between p-3 rounded-lg bg-blue-50/50 cursor-pointer hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">2</div>
                    <span className="text-sm text-gray-800">拆解 3 个同领域爆款，学习内容结构</span>
                  </div>
                  <ArrowRight size={16} className="text-blue-600" />
                </div>
              )}
              <div
                onClick={() => navigate('/workbench/video-director')}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">→</div>
                  <span className="text-sm text-gray-800">进入 AI 视频导演，开始生产内容</span>
                </div>
                <ArrowRight size={16} className="text-gray-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
