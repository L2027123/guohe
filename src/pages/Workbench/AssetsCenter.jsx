import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import {
  Package,
  FolderOpen,
  BarChart3,
  ArrowRight,
  Sparkles,
  FileText,
  TrendingUp,
  CheckCircle2,
  Clock,
  Star,
  Archive,
} from 'lucide-react'

function EntryCard({ icon: Icon, title, desc, badge, path, color, onClick }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
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

export default function AssetsCenter() {
  const navigate = useNavigate()
  const currentProjectId = useStore((s) => s.currentProjectId)
  const projects = useStore((s) => s.projects)
  const allAssets = useStore((s) => s.assets)
  const allContents = useStore((s) => s.contents)
  const allPerformanceRecords = useStore((s) => s.performanceRecords)
  const allPatterns = useStore((s) => s.contentPatterns)

  const currentProject = useMemo(
    () => projects.find((p) => p.id === currentProjectId),
    [projects, currentProjectId]
  )
  const projectAssets = useMemo(
    () => allAssets.filter((a) => a.projectId === currentProjectId),
    [allAssets, currentProjectId]
  )
  const projectContents = useMemo(
    () => allContents.filter((c) => c.projectId === currentProjectId),
    [allContents, currentProjectId]
  )
  const projectRecords = useMemo(
    () => allPerformanceRecords.filter((r) => r.projectId === currentProjectId),
    [allPerformanceRecords, currentProjectId]
  )
  const projectPatterns = useMemo(
    () => allPatterns.filter((p) => p.projectId === currentProjectId),
    [allPatterns, currentProjectId]
  )

  const entries = [
    {
      icon: Archive,
      title: '内容资产库',
      desc: '管理所有已生成内容、历史脚本、爆款模板，支持检索和复用',
      badge: `${projectAssets.length} 份资产`,
      path: '/factory/assets',
      color: 'blue',
    },
    {
      icon: BarChart3,
      title: '数据复盘',
      desc: '记录每篇内容的表现数据，分析规律反馈到内容规则',
      badge: `${projectRecords.length} 条记录`,
      path: '/data-center/content-data',
      color: 'emerald',
    },
  ]

  // 计算累计数据
  const totalViews = projectRecords.reduce((s, r) => s + (r.metrics?.views || 0), 0)
  const totalInteractions = projectRecords.reduce((s, r) => s + (r.metrics?.likes || 0) + (r.metrics?.comments || 0) + (r.metrics?.saves || 0) + (r.metrics?.shares || 0), 0)
  const avgInteractionRate = totalViews > 0 ? ((totalInteractions / totalViews) * 100).toFixed(1) : '0.0'

  return (
    <div className="flex flex-col h-full">
      {/* 顶部栏 */}
      <header className="px-6 py-4 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Package size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">内容资产中心</h1>
            <p className="text-sm text-gray-500 mt-0.5">管理内容资产 · 沉淀爆款模板 · 数据反馈优化</p>
          </div>
        </div>
      </header>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* 工作台说明 */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-100">
            <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Sparkles size={18} className="text-blue-600" />
              工作台说明
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              内容资产中心是你的内容仓库。
              在<span className="font-medium text-blue-700">内容资产库</span>中管理所有生成过的脚本和内容，
              然后通过<span className="font-medium text-blue-700">数据复盘</span>记录每篇内容的真实表现，
              数据会自动反馈给 AI，持续优化后续产出。
            </p>
          </div>

          {/* 数据概览 */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen size={16} className="text-blue-500" />
                <span className="text-xs text-gray-500">内容资产</span>
              </div>
              <div className="text-2xl font-semibold text-gray-900 tabular">
                {projectAssets.length}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">已归档脚本</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={16} className="text-purple-500" />
                <span className="text-xs text-gray-500">内容草稿</span>
              </div>
              <div className="text-2xl font-semibold text-gray-900 tabular">
                {projectContents.length}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">待归档/编辑中</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-emerald-500" />
                <span className="text-xs text-gray-500">总浏览量</span>
              </div>
              <div className="text-2xl font-semibold text-gray-900 tabular">
                {totalViews > 9999 ? (totalViews / 10000).toFixed(1) + 'w' : totalViews.toLocaleString()}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">{projectRecords.length} 条数据</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star size={16} className="text-amber-500" />
                <span className="text-xs text-gray-500">平均互动率</span>
              </div>
              <div className="text-2xl font-semibold text-gray-900 tabular">
                {avgInteractionRate}%
              </div>
              <div className="text-[11px] text-gray-400 mt-1">点赞+评论+收藏+分享</div>
            </div>
          </div>

          {/* 两个入口卡片 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">工作台入口</h3>
            <div className="grid grid-cols-2 gap-4">
              {entries.map((e, i) => (
                <EntryCard
                  key={i}
                  {...e}
                  onClick={() => navigate(e.path)}
                />
              ))}
            </div>
          </div>

          {/* 最近资产 */}
          {projectAssets.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Clock size={18} className="text-blue-600" />
                  最近内容资产
                </h3>
                <span
                  className="text-xs text-blue-600 cursor-pointer hover:text-blue-700 font-medium"
                  onClick={() => navigate('/factory/assets')}
                >
                  查看全部 →
                </span>
              </div>
              <div className="space-y-2">
                {projectAssets.slice(0, 4).map((a) => {
                  const record = projectRecords.find((r) => r.assetId === a.id || r.contentId === a.contentId)
                  return (
                    <div
                      key={a.id}
                      onClick={() => navigate('/factory/assets')}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {a.title || '未命名内容'}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {a.createdAt ? new Date(a.createdAt).toLocaleDateString('zh-CN') : '未记录日期'}
                          {record && ` · ${(record.metrics?.views || 0).toLocaleString()} 浏览`}
                        </div>
                      </div>
                      {record ? (
                        <div className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">
                          <CheckCircle2 size={12} />
                          已复盘
                        </div>
                      ) : (
                        <div className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                          待复盘
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 爆款模板 */}
          {projectPatterns.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Star size={18} className="text-amber-500" />
                  学习的爆款模式
                </h3>
                <span
                  className="text-xs text-brand-600 cursor-pointer hover:text-brand-700 font-medium"
                  onClick={() => navigate('/intelligence/inspiration')}
                >
                  添加更多 →
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {projectPatterns.slice(0, 3).map((p, i) => (
                  <div key={i} className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                    <div className="text-xs font-medium text-gray-900 mb-1 truncate">
                      {p.patternName || `模式 ${i + 1}`}
                    </div>
                    <div className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                      {p.hookStructure || p.structureSummary || '已学习的爆款结构规律'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 下一步建议 */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ArrowRight size={18} className="text-blue-600" />
              下一步建议
            </h3>
            <div className="space-y-2">
              {projectAssets.length === 0 && projectContents.length > 0 && (
                <div
                  onClick={() => navigate('/factory/pipeline')}
                  className="flex items-center justify-between p-3 rounded-lg bg-blue-50/50 cursor-pointer hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">1</div>
                    <span className="text-sm text-gray-800">完成 Pipeline 最后一步，将内容归档到资产库</span>
                  </div>
                  <ArrowRight size={16} className="text-blue-600" />
                </div>
              )}
              {projectRecords.length === 0 && projectAssets.length > 0 && (
                <div
                  onClick={() => navigate('/data-center/content-data')}
                  className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 cursor-pointer hover:bg-emerald-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">2</div>
                    <span className="text-sm text-gray-800">去数据复盘，记录第一篇内容的真实表现</span>
                  </div>
                  <ArrowRight size={16} className="text-emerald-600" />
                </div>
              )}
              <div
                onClick={() => navigate('/workbench/opportunity-radar')}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">→</div>
                  <span className="text-sm text-gray-800">回到 AI 机会雷达，发现下一条内容方向</span>
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
