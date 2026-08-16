import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Bot, Dna, Sparkles, BarChart3, ArrowRight, FileText, TrendingUp, Lightbulb, Zap, Search, RefreshCw, Radar, Brain, Clapperboard, Package } from 'lucide-react'

export default function AIOfficer() {
  const navigate = useNavigate()
  const currentProjectId = useStore((s) => s.currentProjectId)
  const projects = useStore((s) => s.projects)
  const allStyleDNA = useStore((s) => s.styleDNA)
  const allStyleRules = useStore((s) => s.styleRules)
  const allContents = useStore((s) => s.contents)
  const allAssets = useStore((s) => s.assets)
  const allPatterns = useStore((s) => s.contentPatterns)
  const allPerformanceRecords = useStore((s) => s.performanceRecords)
  const allTopics = useStore((s) => s.topics)

  const currentProject = useMemo(
    () => projects.find((p) => p.id === currentProjectId),
    [projects, currentProjectId]
  )
  const currentDNA = useMemo(
    () => allStyleDNA.find((d) => d.projectId === currentProjectId && d.status === 'active'),
    [allStyleDNA, currentProjectId]
  )
  const projectRules = useMemo(
    () => allStyleRules.filter((r) => r.projectId === currentProjectId),
    [allStyleRules, currentProjectId]
  )
  const projectContents = useMemo(
    () => allContents.filter((c) => c.projectId === currentProjectId),
    [allContents, currentProjectId]
  )
  const projectAssets = useMemo(
    () => allAssets.filter((a) => a.projectId === currentProjectId),
    [allAssets, currentProjectId]
  )
  const projectPatterns = useMemo(
    () => allPatterns.filter((p) => p.projectId === currentProjectId),
    [allPatterns, currentProjectId]
  )
  const projectRecords = useMemo(
    () => allPerformanceRecords.filter((r) => r.projectId === currentProjectId),
    [allPerformanceRecords, currentProjectId]
  )
  const projectTopics = useMemo(
    () => allTopics.filter((t) => t.projectId === currentProjectId),
    [allTopics, currentProjectId]
  )

  const confirmedRules = projectRules.filter((r) => r.confirmed)
  const avgScore = confirmedRules.length > 0
    ? Math.round(confirmedRules.reduce((s, r) => s + (r.effectivenessScore || 0), 0) / confirmedRules.length)
    : 0

  const capabilities = [
    { icon: Dna, title: '风格感知', desc: '读取你的风格模型，理解账号定位和内容风格', color: 'bg-purple-50 text-purple-500', active: !!currentDNA },
    { icon: Lightbulb, title: '爆款学习', desc: '分析优秀内容，提取可复用的内容模式', color: 'bg-amber-50 text-amber-500', active: projectPatterns.length > 0 },
    { icon: Sparkles, title: '智能生成', desc: '基于学习规则和爆款模式，生成符合定位的内容', color: 'bg-brand-50 text-brand-500', active: projectContents.length > 0 },
    { icon: BarChart3, title: '数据复盘', desc: '分析内容表现，反馈优化建议到风格规则', color: 'bg-emerald-50 text-emerald-500', active: projectRecords.length > 0 },
  ]

  const guides = [
    {
      icon: Radar,
      title: '去 AI 机会雷达',
      desc: projectTopics.length > 0 || projectPatterns.length > 0 ? '已发现内容方向' : '尚未开始发现',
      path: '/workbench/opportunity-radar',
      done: projectTopics.length > 0 || projectPatterns.length > 0,
    },
    {
      icon: Brain,
      title: '去 AI 账号大脑',
      desc: currentDNA ? `已生成风格模型 v${currentDNA.version}` : '尚未生成',
      path: '/workbench/account-brain',
      done: !!currentDNA,
    },
    {
      icon: Clapperboard,
      title: '去 AI 视频导演',
      desc: projectContents.length > 0 ? `已生产 ${projectContents.length} 条脚本` : '尚未生产',
      path: '/workbench/video-director',
      done: projectContents.length > 0,
    },
    {
      icon: Package,
      title: '去内容资产中心',
      desc: projectRecords.length > 0 ? `${projectRecords.length} 条表现复盘` : '尚未归档复盘',
      path: '/workbench/assets-center',
      done: projectAssets.length > 0 || projectRecords.length > 0,
    },
  ]

  return (
    <div className="flex flex-col h-full">
      <header className="px-6 py-4 bg-white border-b border-gray-100">
        <h1 className="text-xl font-semibold text-gray-900">AI 助手</h1>
        <p className="text-sm text-gray-500 mt-1">你的全局智能运营助手</p>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* 定位说明 */}
          <div className="bg-gradient-to-br from-brand-50 to-purple-50 rounded-xl border border-brand-100 p-6">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
                <Bot size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">AI 助手</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  分析你的账号状态，提供优化建议，推荐下一步应该做的动作。
                  配合 AI 机会雷达、账号大脑、视频导演、资产中心四大工作台，帮你持续产出爆款短视频。
                </p>
              </div>
            </div>
            {currentProject && (
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-brand-100">
                <span className="text-xs text-gray-500">当前账号</span>
                <span className="text-xs font-medium text-gray-900">{currentProject.name}</span>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-500">{currentProject.platform}</span>
              </div>
            )}
          </div>

          {/* 今日任务 */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} className="text-amber-500" />
              <h3 className="font-semibold text-gray-900">你的账号今日建议</h3>
            </div>
            <div className="space-y-2">
              {[
                { icon: Search, title: '分析 3 个热门机会', desc: '查看 AI 机会雷达，发现当前热门趋势', path: '/workbench/opportunity-radar' },
                { icon: RefreshCw, title: '优化内容表现', desc: projectRecords.length > 0 ? `你有 ${projectRecords.length} 条表现数据待复盘，去资产中心` : '去内容资产中心复盘历史内容表现', path: '/workbench/assets-center' },
                { icon: FileText, title: '生成 2 个新选题', desc: projectTopics.length > 0 ? `已有 ${projectTopics.length} 个选题，去视频导演继续生产` : '进入 AI 视频导演，产出下一条视频', path: '/workbench/video-director' },
              ].map((task, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 border border-gray-100">
                    <task.icon size={15} className="text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{task.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{task.desc}</div>
                  </div>
                  <button
                    onClick={() => navigate(task.path)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 shrink-0 transition-colors"
                  >
                    立即执行
                    <ArrowRight size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 账号能力概览 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">账号能力概览</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {capabilities.map((cap, i) => (
                <div key={i} className={`bg-white rounded-xl border p-4 ${cap.active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${cap.color}`}>
                    <cap.icon size={16} />
                  </div>
                  <div className="text-sm font-medium text-gray-900 mb-0.5">{cap.title}</div>
                  <p className="text-[11px] text-gray-500 leading-snug">{cap.desc}</p>
                  {cap.active && (
                    <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      已激活
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 数据快照 */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">内容系统数据</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-900 tabular">{projectRules.length}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">风格规则</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-900 tabular">{confirmedRules.length}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">已确认</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-900 tabular">{projectPatterns.length}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">爆款模式</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-900 tabular">{projectContents.length}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">生成内容</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-900 tabular">{projectAssets.length}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">内容资产</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-900 tabular">{avgScore}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">平均效果分</div>
              </div>
            </div>
          </div>

          {/* 运营指引 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">下一步建议</h3>
            <div className="space-y-2">
              {guides.map((g, i) => (
                <div
                  key={i}
                  onClick={() => navigate(g.path)}
                  className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:border-gray-200 hover:shadow-sm transition-all"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    g.done ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'
                  }`}>
                    <g.icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{g.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{g.desc}</div>
                  </div>
                  {g.done ? (
                    <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 font-medium shrink-0">已完成</span>
                  ) : (
                    <ArrowRight size={16} className="text-gray-400 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 底部说明 */}
          <div className="text-center pt-2">
            <p className="text-xs text-gray-400">
              AI 助手正在持续进化，后续将支持对话式运营指导和自动化动作执行
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
