import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAnalyticsSummary } from '../utils/tracker'
import {
  BarChart3,
  Users,
  CheckCircle2,
  FileText,
  Clock,
  AlertTriangle,
  TrendingUp,
  Activity,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react'

const EVENT_LABELS = {
  landing_view: '打开 Landing',
  click_start_analysis: '点击开始分析',
  onboarding_complete: '完成 Onboarding',
  diagnosis_success: '诊断成功',
  topics_generate: '生成选题',
  content_generate: '生成内容',
  view_style_dna: '查看风格模型',
  view_topics: '查看选题',
}

const LEVEL_CONFIG = {
  A: { label: 'A · 高兴趣', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  B: { label: 'B · 普通', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  C: { label: 'C · 流失风险', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' },
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  const colorMap = {
    brand: 'bg-brand-50 text-brand-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon size={20} />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

export default function AdminAnalytics() {
  const navigate = useNavigate()
  const [refreshKey, setRefreshKey] = useState(0)

  const summary = useMemo(() => getAnalyticsSummary(), [refreshKey])

  const handleRefresh = () => setRefreshKey((k) => k + 1)

  const levelCfg = LEVEL_CONFIG[summary.interest.level] || LEVEL_CONFIG.C

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部栏 */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 size={20} className="text-brand-600" />
                Beta 行为分析后台
              </h1>
              <p className="text-xs text-gray-400">仅管理员可见 · 数据来自本地浏览器</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <RefreshCw size={14} />
            刷新
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* 核心指标卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="今日访问"
            value={summary.todayVisits}
            sub={`累计访问 ${summary.totalVisits} 次`}
            color="brand"
          />
          <StatCard
            icon={CheckCircle2}
            label="完成分析"
            value={summary.completedAnalysis}
            sub="完成 Onboarding 用户数"
            color="emerald"
          />
          <StatCard
            icon={FileText}
            label="生成内容"
            value={summary.generatedContent}
            sub="累计生成内容次数"
            color="blue"
          />
          <StatCard
            icon={Clock}
            label="平均停留"
            value={`${summary.avgDwellMin} 分钟`}
            sub="所有页面平均"
            color="amber"
          />
        </div>

        {/* 流失预警 + 兴趣评级 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              最高流失页面
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-gray-900">{summary.topChurnPage}</span>
              {summary.topChurnCount > 0 && (
                <span className="text-sm text-red-500">
                  停留不足 10 秒 {summary.topChurnCount} 次
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              停留不足 10 秒视为流失信号，需优化该页面首屏体验
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp size={18} className="text-brand-600" />
              用户兴趣评级
            </h3>
            <div className="flex items-center gap-3 mb-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${levelCfg.bg} ${levelCfg.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${levelCfg.dot}`} />
                {levelCfg.label}
              </span>
              <span className="text-2xl font-bold text-gray-900 tabular-nums">
                {summary.interest.score}
              </span>
              <span className="text-xs text-gray-400">分</span>
            </div>
            {summary.interest.signals.length > 0 ? (
              <ul className="space-y-1">
                {summary.interest.signals.map((s, i) => (
                  <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                    <span className="text-brand-400 mt-0.5">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-400">暂无兴趣信号，等待用户行为数据</p>
            )}
          </div>
        </div>

        {/* 各页面停留明细 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock size={18} className="text-blue-500" />
            各页面平均停留
          </h3>
          {summary.pageDwell.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">暂无页面停留数据</p>
          ) : (
            <div className="space-y-3">
              {summary.pageDwell
                .sort((a, b) => b.avgDuration - a.avgDuration)
                .map((p) => {
                  const maxAvg = Math.max(...summary.pageDwell.map((x) => x.avgDuration), 1)
                  const widthPct = Math.max(8, Math.round((p.avgDuration / maxAvg) * 100))
                  return (
                    <div key={p.page} className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 w-24 shrink-0">{p.page}</span>
                      <div className="flex-1 h-6 bg-gray-50 rounded-md overflow-hidden">
                        <div
                          className="h-full bg-brand-100 rounded-md flex items-center px-2"
                          style={{ width: `${widthPct}%` }}
                        >
                          <span className="text-[11px] text-brand-700 font-medium tabular-nums">
                            {p.avgDuration}s
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 w-16 text-right tabular-nums">
                        {p.count} 次
                      </span>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* 事件统计 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity size={18} className="text-emerald-500" />
            核心行为事件统计
          </h3>
          {Object.keys(summary.eventCounts).length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">暂无事件数据</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(summary.eventCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([name, count]) => (
                  <div key={name} className="p-3 rounded-lg bg-gray-50">
                    <div className="text-xs text-gray-500 mb-1">
                      {EVENT_LABELS[name] || name}
                    </div>
                    <div className="text-lg font-semibold text-gray-900 tabular-nums">
                      {count}
                    </div>
                    <div className="text-[11px] text-gray-400">{name}</div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* 首次访问时间 */}
        <div className="text-center text-xs text-gray-400 pb-4">
          首次访问：{summary.firstVisit ? new Date(summary.firstVisit).toLocaleString('zh-CN') : '—'}
        </div>
      </div>
    </div>
  )
}
